import { Globals } from './globals';
import { ExtensionTypes, K8SClientFactory, KindTypes, LabelMap, NamespacedTypes, WatchTypes } from './interfaces';

export function apiPrefix() {
  return Globals.K8S_PREFIX;
}

export function osApiPrefix() {
  return Globals.OS_PREFIX;
}

export function extPrefix() {
  return Globals.K8S_EXT_PREFIX;
}

export function masterApiUrl() {
  return Globals.masterUrl || '';
}

export function namespaced(kind: string) {
  switch (kind) {
    case WatchTypes.POLICIES:
    case WatchTypes.OAUTH_CLIENTS:
    case WatchTypes.NAMESPACES:
    case WatchTypes.NODES:
    case WatchTypes.PERSISTENT_VOLUMES:
    case WatchTypes.PROJECTS:
      return false;

    default:
      return true;
  }
}

export function kubernetesApiPrefix() {
  return URI.joinPaths(apiPrefix(), Globals.K8S_API_VERSION);
}

export function kubernetesApiExtensionPrefix() {
  return URI.joinPaths(Globals.K8S_EXT_PREFIX, Globals.K8S_EXTENSIONS, Globals.K8S_EXT_VERSION);
}

export function openshiftApiPrefix() {
  return URI.joinPaths(osApiPrefix(), Globals.OS_API_VERSION);
}

export function apiForKind(kind: string) {
  if (kind === WatchTypes.NAMESPACES) {
    return Globals.K8S_PREFIX;
  }
  if (_.some(ExtensionTypes.extensions, (t) => t === kind)) {
    return Globals.K8S_EXT_PREFIX;
  }
  if (_.some(NamespacedTypes.k8sTypes, (t) => t === kind)) {
    return Globals.K8S_PREFIX;
  }
  if (_.some(NamespacedTypes.osTypes, (t) => t === kind)) {
    return Globals.OS_PREFIX;
  }
  if (kind === WatchTypes.IMAGES) {
    return Globals.OS_PREFIX;
  }
  return null;
}

export function apiVersionForKind(kind: string) {
  const api = apiForKind(kind);
  switch (api) {
    case Globals.K8S_EXT_PREFIX:
      return kubernetesApiExtensionPrefix();
    case Globals.K8S_API_VERSION:
      return kubernetesApiPrefix();
    case Globals.OS_API_VERSION:
      return openshiftApiPrefix();
    default:
      return null;
  }
}

export function prefixForKind(kind: string) {
  const api = apiForKind(kind);
  switch (api) {
    case Globals.K8S_EXT_PREFIX:
      return kubernetesApiExtensionPrefix();
    case Globals.K8S_PREFIX:
      return kubernetesApiPrefix();
    case Globals.OS_PREFIX:
      return openshiftApiPrefix();
    default:
      return null;
  }
}

export function kubernetesApiUrl() {
  return URI.joinPaths(masterApiUrl(), kubernetesApiPrefix());
}

export function openshiftApiUrl() {
  return URI.joinPaths(masterApiUrl(), openshiftApiPrefix());
}

/*
 * Extracts the k8s/openshift error response if present
 */
export function getErrorObject(jqXHR) {
  let answer: any = jqXHR.responseText;
  try {
    answer = JSON.parse(answer);
  } catch (err) {
    // nothing to do...
  }
  return answer;
}

/*
 * Returns either secure/insecure websocket protocol based on the master URI protocol
 */
export function wsScheme(url: string) {
  const protocol = new URI(url).protocol() || 'http';
  if (_.startsWith(protocol, 'https')) {
    return 'wss';
  } else {
    return 'ws';
  }
}

/*
 * Returns the single 'kind' of an object from the collection kind
 */
export function toKindName(kind: any) {
  if (_.isObject(kind)) {
    return getKind(kind);
  }
  switch (kind) {
    case WatchTypes.LIST: return KindTypes.LIST;
    case WatchTypes.ENDPOINTS: return KindTypes.ENDPOINTS;
    case WatchTypes.EVENTS: return KindTypes.EVENTS;
    case WatchTypes.NAMESPACES: return KindTypes.NAMESPACES;
    case WatchTypes.NODES: return KindTypes.NODES;
    case WatchTypes.PERSISTENT_VOLUMES: return KindTypes.PERSISTENT_VOLUMES;
    case WatchTypes.PERSISTENT_VOLUME_CLAIMS: return KindTypes.PERSISTENT_VOLUME_CLAIMS;
    case WatchTypes.PODS: return KindTypes.PODS;
    case WatchTypes.REPLICATION_CONTROLLERS: return KindTypes.REPLICATION_CONTROLLERS;
    case WatchTypes.REPLICA_SETS: return KindTypes.REPLICA_SETS;
    case WatchTypes.RESOURCE_QUOTAS: return KindTypes.RESOURCE_QUOTAS;
    case WatchTypes.OAUTH_CLIENTS: return KindTypes.OAUTH_CLIENTS;
    case WatchTypes.SECRETS: return KindTypes.SECRETS;
    case WatchTypes.SERVICES: return KindTypes.SERVICES;
    case WatchTypes.SERVICE_ACCOUNTS: return KindTypes.SERVICE_ACCOUNTS;
    case WatchTypes.CONFIG_MAPS: return KindTypes.CONFIG_MAPS;
    case WatchTypes.INGRESSES: return KindTypes.INGRESSES;
    case WatchTypes.TEMPLATES: return KindTypes.TEMPLATES;
    case WatchTypes.ROUTES: return KindTypes.ROUTES;
    case WatchTypes.BUILD_CONFIGS: return KindTypes.BUILD_CONFIGS;
    case WatchTypes.BUILDS: return KindTypes.BUILDS;
    case WatchTypes.DEPLOYMENT_CONFIGS: return KindTypes.DEPLOYMENT_CONFIGS;
    case WatchTypes.DEPLOYMENTS: return KindTypes.DEPLOYMENTS;
    case WatchTypes.IMAGES: return KindTypes.IMAGES;
    case WatchTypes.IMAGE_STREAMS: return KindTypes.IMAGE_STREAMS;
    case WatchTypes.IMAGE_STREAM_TAGS: return KindTypes.IMAGE_STREAM_TAGS;
    case WatchTypes.POLICIES: return KindTypes.POLICIES;
    case WatchTypes.POLICY_BINDINGS: return KindTypes.POLICY_BINDINGS;
    case WatchTypes.PROJECTS: return KindTypes.PROJECTS;
    case WatchTypes.ROLE_BINDINGS: return KindTypes.ROLE_BINDINGS;
    case WatchTypes.ROLES: return KindTypes.ROLES;
    case WatchTypes.DAEMONSETS: return KindTypes.DAEMONSETS;
    default: return kind;
  }
}

/*
 * Returns the collection kind of an object from the singular kind
 */
export function toCollectionName(kind: any) {
  if (_.isObject(kind)) {
    kind = getKind(kind);
  }
  switch (kind) {
    case KindTypes.LIST: return WatchTypes.LIST;
    case KindTypes.ENDPOINTS: return WatchTypes.ENDPOINTS;
    case KindTypes.EVENTS: return WatchTypes.EVENTS;
    case KindTypes.NAMESPACES: return WatchTypes.NAMESPACES;
    case KindTypes.NODES: return WatchTypes.NODES;
    case KindTypes.PERSISTENT_VOLUMES: return WatchTypes.PERSISTENT_VOLUMES;
    case KindTypes.PERSISTENT_VOLUME_CLAIMS: return WatchTypes.PERSISTENT_VOLUME_CLAIMS;
    case KindTypes.PODS: return WatchTypes.PODS;
    case KindTypes.REPLICATION_CONTROLLERS: return WatchTypes.REPLICATION_CONTROLLERS;
    case KindTypes.REPLICA_SETS: return WatchTypes.REPLICA_SETS;
    case KindTypes.RESOURCE_QUOTAS: return WatchTypes.RESOURCE_QUOTAS;
    case KindTypes.OAUTH_CLIENTS: return WatchTypes.OAUTH_CLIENTS;
    case KindTypes.SECRETS: return WatchTypes.SECRETS;
    case KindTypes.SERVICES: return WatchTypes.SERVICES;
    case KindTypes.SERVICE_ACCOUNTS: return WatchTypes.SERVICE_ACCOUNTS;
    case KindTypes.CONFIG_MAPS: return WatchTypes.CONFIG_MAPS;
    case KindTypes.INGRESSES: return WatchTypes.INGRESSES;
    case KindTypes.TEMPLATES: return WatchTypes.TEMPLATES;
    case KindTypes.ROUTES: return WatchTypes.ROUTES;
    case KindTypes.BUILD_CONFIGS: return WatchTypes.BUILD_CONFIGS;
    case KindTypes.BUILDS: return WatchTypes.BUILDS;
    case KindTypes.DEPLOYMENT_CONFIGS: return WatchTypes.DEPLOYMENT_CONFIGS;
    case KindTypes.DEPLOYMENTS: return WatchTypes.DEPLOYMENTS;
    case KindTypes.IMAGES: return WatchTypes.IMAGES;
    case KindTypes.IMAGE_STREAMS: return WatchTypes.IMAGE_STREAMS;
    case KindTypes.IMAGE_STREAM_TAGS: return WatchTypes.IMAGE_STREAM_TAGS;
    case KindTypes.POLICIES: return WatchTypes.POLICIES;
    case KindTypes.POLICY_BINDINGS: return WatchTypes.POLICY_BINDINGS;
    case KindTypes.PROJECTS: return WatchTypes.PROJECTS;
    case KindTypes.ROLE_BINDINGS: return WatchTypes.ROLE_BINDINGS;
    case KindTypes.ROLES: return WatchTypes.ROLES;
    case KindTypes.DAEMONSETS: return WatchTypes.DAEMONSETS;
    default: return kind;
  }
}

/*
 * Returns the websocket URL for the supplied URL
 */
export function wsUrl(url: string) {
  const protocol = wsScheme(url);
  return new URI(url).scheme(protocol);
}

/*
 * Compare two k8s objects based on their UID
 */
export function equals(left, right): boolean {
  const leftUID = getUID(left);
  const rightUID = getUID(right);
  if (!leftUID && !rightUID) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return leftUID === rightUID;
}

/**
 *
 * Kubernetes object helpers
 *
 **/

/**
 * Create a list of kubernetes objects suitable for posting a bunch of objects
 */
export function createList(...objects: any[]) {
  const answer = {
    apiVersion: Globals.K8S_API_VERSION,
    kind: toKindName(WatchTypes.LIST),
    objects: []
  };
  _.forEach(objects, (object) => {
    if (Array.isArray(object)) {
      _.forEach(object, (o) => {
        answer.objects.push(o);
      });
    } else {
      answer.objects.push(object);
    }
  });
  return answer;
}

/**
 * Create an object suitable for delete/del
 */
export function createShallowObject(name: string, kind: string, namespace?: string) {
  return {
    apiVersion: Globals.K8S_API_VERSION,
    kind: toKindName(kind),
    metadata: {
      name: name,
      namespace: namespace
    }
  };
}

/**
 * Filter a collection by label
 **/
export function filterByLabel(objects: Array<any>, labelSelector: LabelMap) {
  const matches = (<any>_).matches(labelSelector);
  return _.filter(objects, (object) => {
    return matches(getLabels(object));
  });
}

/**
 * Apply the given namespace to an object if it isn't already set
 */
export function applyNamespace(obj: any, namespace: string) {
  if (!obj.kind || !namespace) {
    return;
  }
  if (namespaced(toCollectionName(obj.kind)) && !obj.metadata.namespace) {
    obj.metadata.namespace = namespace;
  }
}

/**
 * Returns a fully scoped name with the namespace/kind, suitable to use as a key in maps
 **/
export function fullName(entity) {
  const namespace = getNamespace(entity);
  const kind = getKind(entity);
  const name = getName(entity);
  return URI.joinPaths((namespace ? namespace : ''), kind, name);
}

export function getUID(entity) {
  return pathGet(entity, ['metadata', 'uid']);
}

export function getNamespace(entity) {
  const answer = pathGet(entity, ['metadata', 'namespace']);
  // some objects aren't namespaced, so this can return null;
  return answer;
}

export function getApiVersion(entity) {
  return pathGet(entity, ['apiVersion']);
}

export function getLabels(entity) {
  const answer = pathGet(entity, ['metadata', 'labels']);
  return answer ? answer : {};
}

export function getName(entity) {
  return pathGet(entity, ['metadata', 'name']) || pathGet(entity, 'name') || pathGet(entity, 'id');
}

export function getKind(entity) {
  return pathGet(entity, ['metadata', 'kind']) || pathGet(entity, 'kind');
}

export function getSelector(entity) {
  return pathGet(entity, ['spec', 'selector']);
}

export function getHost(pod) {
  return pathGet(pod, ['spec', 'host']) || pathGet(pod, ['spec', 'nodeName']) || pathGet(pod, ['status', 'hostIP']);
}

export function getStatus(pod) {
  return pathGet(pod, ['status', 'phase']);
}

export function getPorts(service) {
  return pathGet(service, ['spec', 'ports']);
}

export function getCreationTimestamp(entity) {
  return pathGet(entity, ['metadata', 'creationTimestamp']);
}

/**
 * Returns the labels text string using the <code>key1=value1,key2=value2,....</code> format
 */
export function labelsToString(labels, seperatorText = Globals.labelFilterTextSeparator) {
  let answer = '';
  _.forEach(labels, (value, key) => {
    const separator = answer ? seperatorText : '';
    answer += separator + key + '=' + value;
  });
  return answer;
}

/**
 * Returns true if the current status of the pod is running
 */
export function isRunning(podCurrentState) {
  const status = (podCurrentState || {}).phase;
  if (status) {
    const lower = status.toLowerCase();
    return lower.startsWith('run');
  } else {
    return false;
  }
}

/**
 * Returns true if the labels object has all of the key/value pairs from the selector
 */
export function selectorMatches(selector, labels) {
  if (_.isObject(labels)) {
    let answer = true;
    let count = 0;
    _.forEach(selector, (value, key) => {
      count++;
      if (answer && labels[key] !== value) {
        answer = false;
      }
    });
    return answer && count > 0;
  } else {
    return false;
  }
}

export function podStatus(pod) {
  return getStatus(pod);
}

export function getKey(kind: string, namespace?: string) {
  return namespace ? namespace + '-' + kind : kind;
}

/**
 * Navigates the given set of paths in turn on the source object
 * and returns the last most value of the path or null if it could not be found.
 *
 * @method pathGet
 * @for Core
 * @static
 * @param {Object} object the start object to start navigating from
 * @param {Array} paths an array of path names to navigate or a string of dot separated paths to navigate
 * @return {*} the last step on the path which is updated
 */
export function pathGet(object: any, paths: any) {
  const pathArray: string[] = (Array.isArray(paths)) ? paths : (paths || '').split('.');
  let value = object;
  pathArray.forEach(name => {
    if (value) {
      try {
        value = value[name];
      } catch (e) {
        // ignore errors
        return null;
      }
    } else {
      return null;
    }
  });
  return value;
}

export function documentBase() {
  const baseElems: NodeListOf<HTMLBaseElement> = document.getElementsByTagName('base');
  return baseElems.length > 0 ? baseElems.item(0).href : '/';
}

export function trimLeading(text, prefix) {
  if (text && prefix) {
    if (text.indexOf(prefix) === 0) {
      return text.substring(prefix.length);
    }
  }
  return text;
}
