import { Globals } from './globals';

// variable for getting openshift oauth config from
declare var OSOAuthConfig;

const OS_TOKEN_STORAGE_KEY = 'osAuthCreds';

export function currentTimeSeconds() {
  return Math.floor(new Date().getTime() / 1000);
}

export function authenticatedHttpRequest(options, userDetails) {
  return $.ajax(_.extend(options, {
    beforeSend: (request) => {
      if (userDetails.token) {
        request.setRequestHeader('Authorization', 'Bearer ' + userDetails.token);
      }
    }
  }));
}

export function doLogout(config = window['OSOAuthConfig'], userDetails = Globals.userProfile) {
  const currentURI = new URI(window.location.href);
  const uri = new URI(config.oauth_authorize_uri);
  uri.path('/oapi/v1/oAuthAccessTokens' + userDetails.token);
  authenticatedHttpRequest({
    type: 'DELETE',
    url: uri.toString()
  }, userDetails).always(() => {
    clearTokenStorage();
    doLogin(OSOAuthConfig, {
      uri: currentURI.toString()
    });
  });
}

export function doLogin(config, options) {
  const clientId = config.oauth_client_id;
  const targetURI = config.oauth_authorize_uri;
  const uri = new URI(targetURI);
  uri.query({
    client_id: clientId,
    response_type: 'token',
    state: options.uri,
    redirect_uri: options.uri,
    scope: config.scope
  });
  const target = uri.toString();
  console.log('Redirecting to URI: ', target);
  window.location.href = target;
}

export function extractToken(uri) {
  const query = uri.query(true);
  console.log('Query: ', query);
  const fragmentParams: any = new URI('?' + uri.fragment()).query(true);
  console.log('FragmentParams: ', fragmentParams);
  if (fragmentParams.access_token && (fragmentParams.token_type === 'bearer') || fragmentParams.token_type === 'Bearer') {
    console.log('Got token');
    const creds = {
      token_type: fragmentParams.token_type,
      access_token: fragmentParams.access_token,
      expires_in: fragmentParams.expires_in,
      obtainedAt: currentTimeSeconds()
    };
    window.localStorage[OS_TOKEN_STORAGE_KEY] = JSON.stringify(creds);
    delete fragmentParams.token_type;
    delete fragmentParams.access_token;
    delete fragmentParams.expires_in;
    delete fragmentParams.scope;
    uri.fragment('').query(fragmentParams);
    const target = uri.toString();
    console.log('redirecting to: ', target);
    window.location.href = target;
    return creds;
  } else {
    console.log('No token in URI');
    return undefined;
  }
}

export function clearTokenStorage() {
  delete window.localStorage[OS_TOKEN_STORAGE_KEY];
}

export function checkToken(uri): any {
  let answer;
  if (OS_TOKEN_STORAGE_KEY in window.localStorage) {
    try {
      answer = JSON.parse(window.localStorage[OS_TOKEN_STORAGE_KEY]);
    } catch (e) {
      clearTokenStorage();
      // must be broken...
      console.log('Error extracting osAuthCreds value: ', e);
    }
  }
  if (!answer) {
    answer = extractToken(uri);
  }
  console.log('Using creds: ', answer);
  return answer;
}
