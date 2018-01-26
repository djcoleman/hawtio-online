import * as _ from 'lodash';
import * as URI from 'urijs';

import { HawtioOAuth } from '../openshift-oauth/hawtio-oauth';
import { Globals } from './globals';
import {
  toKindName, getName, getKey, getNamespace, equals, getErrorObject, masterApiUrl, wsUrl, filterByLabel,
  prefixForKind, namespaced, toCollectionName, fullName, getKind, getApiVersion
} from './helpers';
import { EventEnabled, WatchActions, WatchTypes, Collection, K8SOptions, LabelMap, K8SClientFactory } from './interfaces';

function beforeSend(request) {
  const token = HawtioOAuth.getOAuthToken();
  if (token) {
    request.setRequestHeader('Authorization', 'Bearer ' + token);
  }
}

// Allow clients to add other types to force polling under whatever circumstances
export let pollingOnly = [WatchTypes.PROJECTS, WatchTypes.IMAGE_STREAM_TAGS];

/**
 *  Manages the array of k8s objects for a client instance
 **/
class ObjectList {
  public triggerChangedEvent = _.debounce(() => {
    this._ee.emit(WatchActions.ANY, this._objects);
  }, 75, { trailing: true });

  private _ee: EventEnabled = undefined;
  private _initialized = false;
  private _objects: Array<any> = [];

  constructor(private _kind: string, private namespace?: string) {
    this._ee = smokesignals.convert(this);
    this._ee.on(WatchActions.ADDED, (object) => {
      console.log('added', this.kind, ':', object);
    });
    this._ee.on(WatchActions.MODIFIED, (object) => {
      console.log('modified', this.kind, ':', object);
    });
    this._ee.on(WatchActions.DELETED, (object) => {
      console.log('deleted', this.kind, ':', object);
    });
    this._ee.on(WatchActions.ANY, (objects) => {
      console.log(this.kind, 'changed:', objects);
    });
    this._ee.on(WatchActions.INIT, (objects) => {
      console.log(this.kind, 'initialized');
    });
    this._ee.on(WatchActions.ANY, (objects) => {
      this.initialize();
    });
  }

  public get kind() {
    return this._kind;
  }

  public initialize() {
    if (this.initialized) {
      return;
    }
    this._initialized = true;
    this._ee.emit(WatchActions.INIT, this._objects);
    this.triggerChangedEvent();
  }

  public get initialized() {
    return this._initialized;
  }

  public get events() {
    return this._ee;
  }

  public get objects() {
    return this._objects;
  }

  public set objects(objs: any[]) {
    this._objects.length = 0;
    _.forEach(objs, (obj) => {
      if (!obj.kind) {
        obj.kind = toKindName(this.kind);
      }
      this._objects.push(obj);
    });
    this.initialize();
    this.triggerChangedEvent();
  }

  public hasNamedItem(item: any) {
    return _.some(this._objects, (obj: any) => {
      return getName(obj) === getName(item);
    });
  }

  public getNamedItem(name: string) {
    return _.find(this._objects, (obj: any) => {
      return getName(obj) === name;
    });
  }

  // filter out objects from other namespaces that could be returned
  private belongs(object) {
    if (this.namespace && getNamespace(object) !== this.namespace) {
      return false;
    }
    return true;
  }

  public added(object) {
    if (!this.belongs(object)) {
      return;
    }
    if (!object.kind) {
      object.kind = toKindName(this.kind);
    }
    if (_.some(this._objects, (obj) => {
      return equals(obj, object);
    })) {
      this.modified(object);
      return;
    }
    this._objects.push(object);
    this._ee.emit(WatchActions.ADDED, object);
    this.triggerChangedEvent();
  }

  public modified(object) {
    if (!this.belongs(object)) {
      return;
    }
    if (!object.kind) {
      object.kind = toKindName(this.kind);
    }
    if (!_.some(this._objects, (obj) => {
      return equals(obj, object);
    })) {
      this.added(object);
      return;
    }
    _.forEach(this._objects, (obj) => {
      if (equals(obj, object)) {
        _.assign(obj, _.cloneDeep(object));
        this._ee.emit(WatchActions.MODIFIED, object);
        this.triggerChangedEvent();
      }
    });
  }

  public deleted(object) {
    if (!this.belongs(object)) {
      return;
    }
    const deleted = _.remove(this._objects, obj => equals(obj, object));
    if (deleted) {
      this._ee.emit(WatchActions.DELETED, deleted[0]);
      this.triggerChangedEvent();
    }
  }
}

interface CompareResult {
  added: Array<any>;
  modified: Array<any>;
  deleted: Array<any>;
}

function compare(old: Array<any>, _new: Array<any>): CompareResult {
  const answer = <CompareResult>{
    added: [],
    modified: [],
    deleted: []
  };
  _.forEach(_new, (newObj) => {
    const oldObj = _.find(old, (o) => equals(o, newObj));
    if (!oldObj) {
      answer.added.push(newObj);
      return;
    }
    if (JSON.stringify(oldObj) !== JSON.stringify(newObj)) {
      answer.modified.push(newObj);
    }
  });
  _.forEach(old, (oldObj) => {
    const newObj = _.find(_new, (o) => equals(o, oldObj));
    if (!newObj) {
      answer.deleted.push(oldObj);
    }
  });
  return answer;
}

/*
 * Manages polling the server for objects that don't support websocket connections
 */
class ObjectPoller {

  private _lastFetch = <Array<any>>[];
  private _connected = false;
  private _interval = 5000;
  private retries = 0;
  private tCancel: any = undefined;

  constructor(private restURL: string, private handler: WSHandler) {
    this._lastFetch = this.handler.list.objects;
  }

  public get connected() {
    return this._connected;
  }

  private doGet() {
    if (!this._connected) {
      return;
    }
    $.ajax(this.restURL, <any>{
      method: 'GET',
      success: (data) => {
        if (!this._connected) {
          return;
        }
        console.log(this.handler.kind, 'fetched data:', data);
        const items = (data && data.items) ? data.items : [];
        const result = compare(this._lastFetch, items);
        this._lastFetch = items;
        _.forIn(result, (items2: any[], action: string) => {
          _.forEach(items2, (item: any) => {
            const event = {
              data: JSON.stringify({
                type: action.toUpperCase(),
                object: _.clone(item)
              })
            };
            this.handler.onmessage(event);
          });
        });
        this.handler.list.initialize();
        // console.log("Result: ", result);
        if (this._connected) {
          this.tCancel = setTimeout(() => {
            console.log(this.handler.kind, 'polling');
            this.doGet();
          }, this._interval);
        }
      },
      error: (jqXHR, text, status) => {
        if (!this._connected) {
          return;
        }
        const error = getErrorObject(jqXHR);
        if (jqXHR.status === 403) {
          console.log(this.handler.kind, '- Failed to poll objects, user is not authorized');
          return;
        }
        if (this.retries >= 3) {
          console.log(this.handler.kind, '- Out of retries, stopping polling, error: ', error);
          this.stop();
          if (this.handler.error) {
            this.handler.error(error);
          }
        } else {
          this.retries = this.retries + 1;
          console.log(this.handler.kind, '- Error polling, retry #', this.retries + 1, ' error: ', error);
          this.tCancel = setTimeout(() => {
            this.doGet();
          }, this._interval);
        }
      },
      beforeSend: beforeSend
    });
  }

  public start() {
    if (this._connected) {
      return;
    }
    this._connected = true;
    this.tCancel = setTimeout(() => {
      this.doGet();
    }, 1);
  }

  public stop() {
    this._connected = false;
    console.log(this.handler.kind, ' - disconnecting');
    if (this.tCancel) {
      console.log(this.handler.kind, ' - cancelling polling');
      clearTimeout(this.tCancel);
      this.tCancel = undefined;
    }
  }

  public destroy() {
    this.stop();
    console.log(this.handler.kind, ' - destroyed');
  }

}

/**
 * Manages the websocket connection to the backend and passes events to the ObjectList
 */
class WSHandler {
  private retries = 0;
  private connectTime = 0;
  private socket: WebSocket;
  private poller: ObjectPoller;
  private self: CollectionImpl = undefined;
  private _list: ObjectList;
  private destroyed = false;

  constructor(private _self: CollectionImpl) {
    this.self = _self;
  }

  set list(_list: ObjectList) {
    this._list = _list;
  }

  get list() {
    return this._list || <ObjectList>{ objects: [] };
  }

  get collection() {
    return this._self;
  }

  get error() {
    return this._self.options.error;
  }

  get kind() {
    return this._self.kind;
  }

  private setHandlers(self: WSHandler, ws: WebSocket) {
    _.forIn(self, (value, key) => {
      if (_.startsWith(key, 'on')) {
        const evt = key.replace('on', '');
        // console.log("Adding event handler for '" + evt + "' using '" + key + "'");
        ws.addEventListener(evt, (event) => {
          console.log('received websocket event: ', event);
          self[key](event);
        });
      }
    });
  }

  public send(data: any) {
    if (!_.isString(data)) {
      data = JSON.stringify(data);
    }
    this.socket.send(data);
  }

  shouldClose(event) {
    if (this.destroyed && this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('Connection destroyed but still receiving messages, closing websocket, kind: ',
        this.self.kind, ' namespace: ', this.self.namespace);
      try {
        console.log('Closing websocket for kind: ', this.self.kind);
        this.socket.close();
      } catch (err) {
        // nothing to do, assume it's already closed
      }
      return true;
    }
    return false;
  }

  onmessage(event) {
    if (this.shouldClose(event)) {
      console.log('Should be closed!');
      return;
    }
    const data = JSON.parse(event.data);
    const eventType = data.type.toLowerCase();
    this._list[eventType](data.object);
  }

  onopen(event) {
    console.log('Received open event for kind: ', this.self.kind, ' namespace: ', this.self.namespace);
    if (this.shouldClose(event)) {
      return;
    }
    this.retries = 0;
    this.connectTime = new Date().getTime();
  }

  onclose(event) {
    console.log('Received close event for kind: ', this.self.kind, ' namespace: ', this.self.namespace);
    if (this.destroyed) {
      console.log('websocket destroyed for kind: ', this.self.kind, ' namespace: ', this.self.namespace);
      delete this.socket;
      return;
    }
    if (this.retries < 3 && this.connectTime && (new Date().getTime() - this.connectTime) > 5000) {
      const self = this;
      setTimeout(() => {
        console.log('Retrying after connection closed: ', event);
        this.retries = this.retries + 1;
        console.log('watch ', this.self.kind, ' disconnected, retry #', this.retries);
        const ws = this.socket = new WebSocket(this.self.wsURL);
        this.setHandlers(self, ws);
      }, 5000);
    } else {
      console.log('websocket for ', this.self.kind, ' closed, event: ', event);
      if (!event.wasClean) {
        console.log('Switching to polling mode');
        delete this.socket;
        this.poller = new ObjectPoller(this.self.restURL, this);
        this.poller.start();
      }
    }
  }

  onerror(event) {
    console.log('websocket for kind: ', this.self.kind, ' received an error: ', event);
    if (this.shouldClose(event)) {
      return;
    }
  }

  get connected(): boolean {
    return (this.socket && this.socket.readyState === WebSocket.OPEN) || (this.poller && this.poller.connected);
  }

  connect() {
    if (this.destroyed) {
      return;
    }
    // in case a custom URL is going to be used
    if (this.self.restURL === '' && this.self.wsURL === '') {
      setTimeout(() => {
        this.connect();
      }, 500);
      return;
    }
    if (!this.socket && !this.poller) {
      if (_.some(pollingOnly, (kind) => kind === this.self.kind)) {
        console.log('Using polling for kind: ', this.self.kind);
        this.poller = new ObjectPoller(this.self.restURL, this);
        this.poller.start();
      } else {
        const doConnect = () => {
          const wsURL = this.self.wsURL;
          if (wsURL) {
            console.log('Connecting websocket for kind: ', this.self.kind);
            this.socket = new WebSocket(wsURL);
            this.setHandlers(this, this.socket);
          } else {
            console.log('No wsURL for kind: ' + this.self.kind);
          }
        };
        $.ajax(this.self.restURL, <any>{
          method: 'GET',
          processData: false,
          success: (data) => {
            this._list.objects = data.items || [];
            setTimeout(() => {
              doConnect();
            }, 10);
          }, error: (jqXHR, text, status) => {
            const err = getErrorObject(jqXHR);
            if (jqXHR.status === 403) {
              console.log('Failed to fetch data while connecting to backend for type: ', this.self.kind, ', user is not authorized');
              this._list.objects = [];
            } else {
              console.log('Failed to fetch data while connecting to backend for type: ', this.self.kind, ' error: ', err);
              setTimeout(() => {
                doConnect();
              }, 10);
            }
          },
          beforeSend: beforeSend
        });
      }
    }
  }

  destroy() {
    this.destroyed = true;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        console.log('Closing websocket for kind: ', this.self.kind, ' namespace: ', this.self.namespace);
        this.socket.close();
        console.log('Close called on websocket for kind: ', this.self.kind, ' namespace: ', this.self.namespace);
      } catch (err) {
        // nothing to do, assume it's already closed
      }
    }
    if (this.poller) {
      console.log('Destroying poller for kind: ', this.self.kind, ' namespace: ', this.self.namespace);
      this.poller.destroy();
    }
  }
}

/*
 * Implements the external API for working with k8s collections of objects
 */
export class CollectionImpl implements Collection {

  private _kind: string;
  private _namespace: string;
  private _path: string;
  private _apiVersion: string;
  private handlers: WSHandler = undefined;
  private list: ObjectList = undefined;

  constructor(private _options: K8SOptions) {
    this._kind = _options.kind;
    this._apiVersion = _options.apiVersion;
    this._namespace = _options.namespace || null;

    const pref = this.getPrefix();

    if (this._namespace) {
      this._path = URI.joinPaths(pref, 'namespaces', this._namespace, this._kind).toString();
    } else {
      this._path = URI.joinPaths(pref, this._kind).toString();
    }
    this.handlers = new WSHandler(this);
    const list = this.list = new ObjectList(_options.kind, _options.namespace);
    this.handlers.list = list;
    console.log('creating new collection for', this.kind, ' namespace: ', this.namespace);
  }

  public get options(): K8SOptions {
    return this._options;
  }

  private get _restUrl() {
    if (this.options.urlFunction && _.isFunction(this.options.urlFunction)) {
      const answer = this.options.urlFunction(this.options);
      if (answer === null || !answer) {
        return null;
      }
      return new URI(answer);
    } else {
      return URI.joinPaths(masterApiUrl(), this._path);
    }
  }

  private get _wsUrl() {
    if (this.options.urlFunction && _.isFunction(this.options.urlFunction)) {
      const answer = this.options.urlFunction(this.options);
      if (answer === null || !answer) {
        return null;
      }
      return wsUrl(answer).query(<any>{
        watch: true,
        access_token: HawtioOAuth.getOAuthToken()
      });
    } else {
      let url = URI.joinPaths(masterApiUrl(), this._path).toString();
      const location = window.location;
      if (location && url.indexOf('://') < 0) {
        let hostname = location.hostname;
        if (hostname) {
          const port = location.port;
          if (port) {
            hostname += ':' + port;
          }
          url = URI.joinPaths(hostname, masterApiUrl(), this._path).toString();
        }
      }
      return wsUrl(url).query(<any>{
        watch: true,
        access_token: HawtioOAuth.getOAuthToken()
      });
    }
  }

  public getKey() {
    return getKey(this._kind, this._namespace);
  }

  public get wsURL() {
    return (this._wsUrl || '').toString();
  }

  public get restURL() {
    return (this._restUrl || '').toString();
  }

  get namespace() {
    return this._namespace;
  }

  get kind() {
    return this._kind;
  }

  get connected(): boolean {
    return this.handlers.connected;
  }

  public connect() {
    if (!this.handlers.connected) {
      this.handlers.connect();
    }
  }

  public destroy() {
    this.handlers.destroy();
    /*
    delete this.handlers;
    delete this.list;
    */
  }

  private addLabelFilter(cb: (data: any[]) => void, labelSelector: LabelMap) {
    console.log('Adding label filter: ', labelSelector);
    const cbOld = cb;
    return (data: any[]) => {
      data = filterByLabel(data, labelSelector);
      cbOld(data);
    };
  }

  // one time fetch of the data...
  public get(cb: (data: any[]) => void, labelSelector?: LabelMap) {
    if (labelSelector) {
      cb = this.addLabelFilter(cb, labelSelector);
    }
    if (!this.list.initialized) {
      this.list.events.once(WatchActions.INIT, cb);
    } else {
      setTimeout(() => {
        cb(this.list.objects);
      }, 10);
    }
  }

  private getPrefix() {
    let pref = prefixForKind(this._kind);
    if (!pref) {
      if (this._apiVersion && _.startsWith(this._apiVersion, 'extensions')) {
        pref = URI.joinPaths(Globals.K8S_EXT_PREFIX, this._apiVersion);
      } else {
        throw new Error('Unknown kind: ' + this._kind);
      }
    }
    return pref;
  }

  private restUrlFor(item: any, useName: boolean = true) {
    const name = getName(item);
    if (useName && !name) {
      console.log('Name missing from item: ', item);
      return undefined;
    }
    let url = URI.joinPaths(this._restUrl.toString()).toString();
    if (this.options.urlFunction && _.isFunction(this.options.urlFunction)) {
      // lets trust the url to be correct
    } else {
      if (namespaced(toCollectionName(item.kind))) {
        const namespace = getNamespace(item) || this._namespace;
        let prefix = this.getPrefix();
        const kind = this._kind;
        if (!Globals.isOpenShift && (kind === 'buildconfigs' || kind === 'BuildConfig')) {
          prefix = URI.joinPaths('/api/v1/proxy/namespaces', namespace, '/services/jenkinshift:80/', prefix);
          console.log('Using buildconfigs URL override');
        }
        url = URI.joinPaths(masterApiUrl(), prefix, 'namespaces', namespace, kind).toString();
      }
    }
    if (useName) {
      url = URI.joinPaths(url, name).toString();
    }
    return url;
  }

  // continually get updates
  public watch(cb: (data: any[]) => void, labelSelector?: LabelMap): (data: any[]) => void {
    if (labelSelector) {
      cb = this.addLabelFilter(cb, labelSelector);
    }
    if (this.list.initialized) {
      setTimeout(() => {
        console.log(this.kind, 'passing existing objects:', this.list.objects);
        cb(this.list.objects);
      }, 10);
    }
    console.log(this.kind, 'adding watch callback:', cb);
    this.list.events.on(WatchActions.ANY, (data) => {
      console.log(this.kind, 'got data:', data);
      cb(data);
    });
    return cb;
  }

  public unwatch(cb: (data: any[]) => void) {
    console.log(this.kind, 'removing watch callback:', cb);
    this.list.events.off(WatchActions.ANY, cb);
  }

  public put(item: any, cb: (data: any) => void, error?: (err: any) => void) {
    let method = 'PUT';
    let url = this.restUrlFor(item);
    if (!this.list.hasNamedItem(item)) {
      // creating a new object
      method = 'POST';
      url = this.restUrlFor(item, false);
    } else {
      // updating an existing object
      let resourceVersion = item.metadata.resourceVersion;
      if (!resourceVersion) {
        const current = this.list.getNamedItem(getName(item));
        resourceVersion = current.metadata.resourceVersion;
        item.metadata.resourceVersion = resourceVersion;
      }
    }
    if (!url) {
      return;
    }
    // Custom checks for specific cases
    switch (this._kind) {
      case WatchTypes.SERVICES:
        if (item.spec.clusterIP === '') {
          delete item.spec.clusterIP;
        }
        break;
      default:

    }
    try {
      $.ajax(url, <any>{
        method: method,
        contentType: 'application/json',
        data: JSON.stringify(item),
        processData: false,
        success: (data) => {
          try {
            const response = JSON.parse(data);
            cb(response);
          } catch (err) {
            cb({});
          }
        },
        error: (jqXHR, text, status) => {
          const err = getErrorObject(jqXHR);
          console.log('Failed to create or update, error: ', err);
          if (error) {
            error(err);
          }
        },
        beforeSend: beforeSend
      });
    } catch (err) {
      error(err);
    }
  }

  public delete(item: any, cb: (data: any) => void, error?: (err: any) => void) {
    const url = this.restUrlFor(item);
    if (!url) {
      return;
    }
    this.list.deleted(item);
    this.list.triggerChangedEvent();
    try {
      $.ajax(url, <any>{
        method: 'DELETE',
        success: (data) => {
          try {
            const response = JSON.parse(data);
            cb(response);
          } catch (err) {
            cb({});
          }
        },
        error: (jqXHR, text, status) => {
          const err = getErrorObject(jqXHR);
          console.log('Failed to delete, error: ', err);
          this.list.added(item);
          this.list.triggerChangedEvent();
          if (error) {
            error(err);
          }
        },
        beforeSend: beforeSend
      });
    } catch (err) {
      error(err);
    }
  }
}

/*
 * Manages references to collection instances to allow them to be shared between views
 */
export class ClientInstance {
  private _refCount = 0;
  private _collection: CollectionImpl = undefined;

  constructor(_collection: CollectionImpl) {
    this._collection = _collection;
  }

  public get refCount() {
    return this._refCount;
  }

  public addRef() {
    this._refCount = this._refCount + 1;
  }

  public removeRef() {
    this._refCount = this._refCount - 1;
  }

  public get collection() {
    return this._collection;
  }

  public disposable() {
    return this._refCount <= 0;
  }

  public destroy() {
    this._collection.destroy();
    // delete this._collection;
  }
}

export interface ClientMap {
  [name: string]: ClientInstance;
}
