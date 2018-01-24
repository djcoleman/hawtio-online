import { KubernetesConfig } from './interfaces';

export class Globals {
  static pluginName = 'KubernetesAPI';
  static pluginPath = 'plugins/kubernetes-api/';
  static templatePath = 'plugins/kubernetes-api/html/';

  static keepPollingModel = true;

  static defaultIconUrl = '/img/kubernetes.svg';
  static hostIconUrl = '/img/host.svg';

  // this gets set as a pre-bootstrap task
  static osConfig: KubernetesConfig;
  static masterUrl = '';
  static isOpenShift = false;

  static K8S_PREFIX = 'api';
  static OS_PREFIX = 'oapi';
  static K8S_EXT_PREFIX = 'apis';

  static K8S_API_VERSION = 'v1';
  static OS_API_VERSION = 'v1';
  static K8S_EXT_VERSION = 'v1beta1';
  static K8S_EXTENSIONS = 'extensions';

  static defaultApiVersion = Globals.K8S_API_VERSION;
  static defaultOSApiVersion = Globals.OS_API_VERSION;

  static labelFilterTextSeparator = ',';
  static defaultNamespace = 'default';
  static appSuffix = '.app';
}
