import { Injectable } from '@angular/core';
import { ClientMap, ClientInstance, CollectionImpl } from './client';
import { Collection, K8SOptions, WatchTypes } from './interfaces';
import { getKey, getName, fullName, getKind, toKindName, toCollectionName, namespaced, getNamespace, getApiVersion } from './helpers';

@Injectable()
export class K8SClientFactory {
  private static NO_KIND = 'No kind in supplied options';
  private static NO_OBJECT = 'No object in supplied options';
  private static NO_OBJECTS = 'No objects in list object';
  private _clients = <ClientMap>{};

  create(options: any, namespace?: any): Collection {
    let kind = options;
    let _options = options;
    if (_.isObject(options)) {
      kind = options.kind;
      namespace = options.namespace || namespace;
    } else {
      _options = {
        kind: kind,
        namespace: namespace
      };
    }
    const key = getKey(kind, namespace);
    if (this._clients[key]) {
      const client = this._clients[key];
      client.addRef();
      console.log('Returning existing client for key: ', key, ' refcount is: ', client.refCount);
      return client.collection;
    } else {
      const client = new ClientInstance(new CollectionImpl(_options));
      client.addRef();
      console.log('Creating new client for key: ', key, ' refcount is: ', client.refCount);
      this._clients[key] = client;
      return client.collection;
    }
  }

  destroy(client: Collection, ...handles: Array<(data: any[]) => void>) {
    _.forEach(handles, (handle) => {
      client.unwatch(handle);
    });
    const key = client.getKey();
    if (this._clients[key]) {
      const c = this._clients[key];
      c.removeRef();
      console.log('Removed reference to client with key: ', key, ' refcount is: ', c.refCount);
      if (c.disposable()) {
        this._clients[key] = undefined;
        c.destroy();
        console.log('Destroyed client for key: ', key);
      }
    }
  }

  /*
   * Get a collection
   */
  get(options: K8SOptions) {
    if (!options.kind) {
      throw K8SClientFactory.NO_KIND;
    }
    const client = this.create(options);
    const success = (data: any[]) => {
      if (options.success) {
        try {
          options.success(data);
        } catch (err) {
          console.log('Supplied success callback threw error: ', err);
        }
      }
      this.destroy(client);
    };
    client.get(success, options.labelSelector);
    client.connect();
  }

  private handleListAction(options: any, action: (object: any, success: (data: any) => void, error: (err: any) => void) => void) {
    if (!options.object.objects) {
      throw K8SClientFactory.NO_OBJECTS;
    }
    const answer = {};
    const objects = _.cloneDeep(options.object.objects);
    function addResult(id, data) {
      answer[id] = data;
      next();
    }
    function next() {
      if (objects.length === 0) {
        console.log('processed all objects, returning status');
        try {
          if (options.success) {
            options.success(answer);
          }
        } catch (err) {
          console.log('Supplied success callback threw error: ', err);
        }
        return;
      }
      const object = objects.shift();
      console.log('Processing object: ', getName(object));
      const success = (data) => {
        addResult(fullName(object), data);
      };
      const error = (data) => {
        addResult(fullName(object), data);
      };
      action(object, success, error);
    }
    next();
  }

  private normalizeOptions(options: any) {
    console.log('Normalizing supplied options: ', options);
    // let's try and support also just supplying k8s objects directly
    if (options.metadata || getKind(options) === toKindName(WatchTypes.LIST)) {
      const object = options;
      options = {
        object: object
      };
      if (object.objects) {
        options.kind = toKindName(WatchTypes.LIST);
      }
    }
    if (!options.object) {
      throw K8SClientFactory.NO_OBJECT;
    }
    if (!options.object.kind) {
      if (options.kind) {
        options.object.kind = toKindName(options.kind);
      } else {
        throw K8SClientFactory.NO_KIND;
      }
    }
    console.log('Options object normalized: ', options);
    return options;
  }

  del(options: any) {
    options = this.normalizeOptions(options);
    // support deleting a list of objects
    if (options.object.kind === toKindName(WatchTypes.LIST)) {
      this.handleListAction(options, (object, successFn, errorFn) => {
        this.del({
          object: object,
          success: successFn,
          error: errorFn
        });
      });
      return;
    }
    options.kind = options.kind || toCollectionName(options.object);
    options.namespace = namespaced(options.kind) ? options.namespace || getNamespace(options.object) : null;
    options.apiVersion = options.apiVersion || getApiVersion(options.object);
    const client = this.create(options);
    const success = (data) => {
      if (options.success) {
        try {
          options.success(data);
        } catch (err) {
          console.log('Supplied success callback threw error: ', err);
        }
      }
      this.destroy(client);
    };
    const error = (err) => {
      if (options.error) {
        try {
          options.error(err);
        } catch (err) {
          console.log('Supplied error callback threw error: ', err);
        }
      }
      this.destroy(client);
    };
    client.delete(options.object, success, error);
  }

  /*
   * Add/replace an object, or a list of objects
   */
  put(options: any) {
    options = this.normalizeOptions(options);
    // support putting a list of objects
    if (options.object.kind === toKindName(WatchTypes.LIST)) {
      this.handleListAction(options, (object: any, success, error) => {
        this.put({
          object: object,
          success: success,
          error: error
        });
      });
      return;
    }
    options.kind = options.kind || toCollectionName(options.object);
    options.namespace = namespaced(options.kind) ? options.namespace || getNamespace(options.object) : null;
    options.apiVersion = options.apiVersion || getApiVersion(options.object);
    const client = this.create(options);
    client.get((objects) => {
      const success = (data) => {
        if (options.success) {
          try {
            options.success(data);
          } catch (err) {
            console.log('Supplied success callback threw error: ', err);
          }
        }
        this.destroy(client);
      };
      const error = (err) => {
        if (options.error) {
          try {
            options.error(err);
          } catch (err) {
            console.log('Supplied error callback threw error: ', err);
          }
        }
        this.destroy(client);
      };
      client.put(options.object, success, error);
    });
    client.connect();
  }

  watch(options: K8SOptions) {
    if (!options.kind) {
      throw K8SClientFactory.NO_KIND;
    }
    const client = <Collection>this.create(options);
    const handle = client.watch(options.success, options.labelSelector);
    const self = {
      client: client,
      handle: handle,
      disconnect: () => {
        this.destroy(self.client, self.handle);
      }
    };
    client.connect();
    return self;
  }

}
