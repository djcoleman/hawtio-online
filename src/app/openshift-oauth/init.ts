import { Globals } from './globals';
import { checkToken, currentTimeSeconds, clearTokenStorage, doLogin } from './helpers';

// variable for getting openshift oauth config from
declare var OSOAuthConfig;

let keepaliveUri: string;
let keepaliveInterval: number;

/**
 * Initialize OpenShift OAuth
 */
export function initOpenshiftOAuth(): Promise<any> {
  return new Promise((resolve, reject) => {
    let openshiftConfig = null;
    try {
      openshiftConfig = window['OPENSHIFT_CONFIG'];
    } catch (e) {
      // ignore
    }
    if (openshiftConfig) {
      const token = openshiftConfig.token;
      if (token) {
        console.log('Loading OAuth token from server. We should switch to using a real OAuth login!');
        Globals.userProfile = {
          token: token
        };
        $.ajaxSetup({
          beforeSend: (xhr) => {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
          }
        });
        resolve();
        return;
      }
    }
    if (!window['OSOAuthConfig']) {
      console.log('oauth disabled');
      resolve();
      return;
    }
    if (!OSOAuthConfig.oauth_client_id ||
      !OSOAuthConfig.oauth_authorize_uri) {
      console.log('Invalid oauth config, disabled oauth');
      resolve();
      return;
    }
    console.log('config: ', OSOAuthConfig);
    const currentURI = new URI(window.location.href);
    const fragmentParams = checkToken(currentURI);
    if (fragmentParams) {
      const tmp = {
        token: fragmentParams.access_token,
        expiry: fragmentParams.expires_in,
        type: fragmentParams.token_type,
        obtainedAt: fragmentParams.obtainedAt || 0
      };
      const uri = new URI(OSOAuthConfig.oauth_authorize_uri);
      uri.path('/oapi/v1/users/~');
      keepaliveUri = uri.toString();
      Globals.userProfile = tmp;
      $.ajax({
        type: 'GET',
        url: keepaliveUri,
        success: (response) => {
          _.merge(Globals.userProfile, tmp, response, { provider: Globals.pluginName });
          let obtainedAt = 0;
          let expiry = 0;
          try {
            obtainedAt = parseInt(Globals.userProfile.obtainedAt, 10);
            expiry = parseInt(Globals.userProfile.expiry, 10);
          } catch (error) {

          }
          if (obtainedAt) {
            const remainingTime = obtainedAt + expiry - currentTimeSeconds();
            if (remainingTime > 0) {
              keepaliveInterval = Math.round(remainingTime / 4);
            }
          }
          if (!keepaliveInterval) {
            keepaliveInterval = 10;
          }
          console.log('userProfile: ', Globals.userProfile);
          $.ajaxSetup({
            beforeSend: xhr => xhr.setRequestHeader('Authorization', 'Bearer ' + Globals.userProfile.token)
          });
          resolve();
        },
        error: (jqXHR, textStatus, errorThrown) => {
          // The request may have been cancelled as the browser refresh request in
          // extractToken may be triggered before getting the AJAX response.
          // In that case, let's just skip the error and go through another refresh cycle.
          // See http://stackoverflow.com/questions/2000609/jquery-ajax-status-code-0 for more details.
          if (jqXHR.status > 0) {
            console.log('Failed to fetch user info, status: ', textStatus, ' error: ', errorThrown);
            clearTokenStorage();
            doLogin(OSOAuthConfig, { uri: currentURI.toString() });
          }
        },
        beforeSend: request => request.setRequestHeader('Authorization', 'Bearer ' + Globals.userProfile.token)
      });
    } else {
      clearTokenStorage();
      doLogin(OSOAuthConfig, {
        uri: currentURI.toString()
      });
    }
  });
}
