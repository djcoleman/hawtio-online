import { Globals } from './globals';
import { KubernetesConfig, WatchTypes } from './interfaces';
import { documentBase, trimLeading, pathGet } from './helpers';
import { pollingOnly } from './client';

declare var OSOAuthConfig: any;
declare var GoogleOAuthConfig: any;
declare var KeycloakConfig: any;

/**
 * Depends on KubernetesApiInit()
 */
export function KubernetesApiConfig() {
  Globals.K8S_PREFIX = trimLeading(pathGet(Globals.osConfig, ['api', 'k8s', 'prefix']) || Globals.K8S_PREFIX, '/');
  Globals.OS_PREFIX = trimLeading(pathGet(Globals.osConfig, ['api', 'openshift', 'prefix']) || Globals.OS_PREFIX, '/');
}

/**
 * Since we're using jenkinshift in vanilla k8s, let's poll build configs by default.
 * Depends on KubernetesApiInit()
 */
export function AddPolledTypes() {
  if (!Globals.isOpenShift) {
    pollingOnly.push(WatchTypes.BUILD_CONFIGS);
  }
}

/**
 * Detect if we're running against openshift or not.
 * Depends on KubernetesApiInit()
 */
export function KubernetesAPIProviderInit() {
  Globals.isOpenShift = false;
  // probe /oapi/v1 as it's has all the openshift extensions
  const testURL = new URI(Globals.masterUrl).segment('oapi/v1').toString();
  $.ajax(<any>{
    url: testURL,
    method: 'GET',
    success: (data) => {
      console.log('data: ', data);
      console.log('Backend is an openshift instance');
      Globals.isOpenShift = true;
    },
    error: (jqXHR, textStatus, errorThrown) => {
      console.log('Error probing ' + testURL + ' assuming backend is not an openshift instance.  Error details: status: ',
        textStatus, ' errorThrown: ', errorThrown, ' jqXHR instance: ', jqXHR);
    }
  });
}

export function FetchConfig() {
  $.getScript('osconsole/config.js')
    .always(() => {
      console.log('Fetched openshift config: ', window['OPENSHIFT_CONFIG']);
      console.log('Fetched keycloak config: ', window['KeycloakConfig']);
      OSOAuthConfig = _.get(window, 'OPENSHIFT_CONFIG.openshift');
      GoogleOAuthConfig = _.get(window, 'OPENSHIFT_CONFIG.google');
    });
}

/**
 * Depends on FetchConfig()
 */
export function KubernetesApiInit() {
  const config: KubernetesConfig = Globals.osConfig = window['OPENSHIFT_CONFIG'];
  console.log('Fetched OAuth config: ', config);
  let master: string = config.master_uri;
  if (!master && config.api && config.api.k8s) {
    const masterUri = new URI().host(config.api.k8s.hostPort).path('').query('');
    if (config.api.k8s.proto) {
      masterUri.protocol(config.api.k8s.proto);
    }
    master = masterUri.toString();
  }

  if (OSOAuthConfig && !master) {
    if (!master) {
      const oauth_authorize_uri = OSOAuthConfig.oauth_authorize_uri;
      if (oauth_authorize_uri) {
        const text = oauth_authorize_uri;
        let idx = text.indexOf('://');
        if (idx > 0) {
          idx += 3;
          idx = text.indexOf('/', idx);
          if (idx > 0) {
            master = text.substring(0, ++idx);
          }
        }
      }
    }
  }
  // We'll just grab the URI for the document here in case we need it
  const documentURI = new URI().path(documentBase());
  if (!master || master === '/') {
    // lets default the master to the current protocol and host/port
    // in case the master url is "/" and we are
    // serving up static content from inside /api/v1/namespaces/default/services/fabric8 or something like that
    console.log('master_url unset or set to \'/\', assuming API server is at /');
    master = documentURI.query('').toString();
  }
  if (master === 'k8s') {
    // We're using the built-in kuisp proxy to access the API server
    console.log('master_url set to \'k8s\', assuming proxy is being used');
    master = documentURI.query('').segment(master).toString();
  }
  console.log('Using kubernetes API URL: ', master);
  Globals.masterUrl = master;
}
