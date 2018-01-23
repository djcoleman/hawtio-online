import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as URI from 'urijs';

import { WatchTypes } from './interfaces';

@Injectable()
export class InitService {

  private osConfig;
  private OSOAuthConfig;
  private GoogleOAuthConfig;
  private masterUrl: string;
  private isOpenShift: boolean;
  private pollingOnly: any[];
  private k8sPrefix;
  private osPrefix;

  constructor(private httpClient: HttpClient) {
    this.osConfig = window['OPENSHIFT_CONFIG'];
    this.OSOAuthConfig = this.osConfig ? this.osConfig.openshift : null;
    this.GoogleOAuthConfig = this.osConfig ? this.osConfig.google : null;
  }

  initMasterUrl(): void {
    let master: string = this.osConfig.master_uri;
    if (!master && this.osConfig.api && this.osConfig.api.k8s) {
      const masterUri = new URI().host(this.osConfig.api.k8s.hostPort).path('').query('');
      if (this.osConfig.api.k8s.proto) {
        masterUri.protocol(this.osConfig.api.k8s.proto);
      }
      master = masterUri.toString();
    }

    if (this.OSOAuthConfig && !master) {
      if (!master) {
        const oauth_authorize_uri = this.OSOAuthConfig.oauth_authorize_uri;
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
    const documentURI = new URI().path(this.documentBase());
    if (!master || master === '/') {
      // lets default the master to the current protocol and host/port
      // in case the master url is "/" and we are
      // serving up static content from inside /api/v1/namespaces/default/services/fabric8 or something like that
      master = documentURI.query('').toString();
    }
    if (master === 'k8s') {
      // We're using the built-in kuisp proxy to access the API server
      master = documentURI.query('').segment(master).toString();
    }
    this.masterUrl = master;
  }

  detectOpenShift(): Promise<any> {
    return this.httpClient
      .get(new URI(this.masterUrl).segment('oapi/v1').toString())
      .toPromise()
      .then(() => this.isOpenShift = true)
      .catch(() => this.isOpenShift = false);
  }

  addPolledTypes(): void {
    if (!this.isOpenShift) {
      this.pollingOnly.push(WatchTypes.BUILD_CONFIGS);
    }
  }

  initPrefixes() {
    this.k8sPrefix = this.trimLeading(this.pathGet(this.osConfig, ['api', 'k8s', 'prefix']) || this.k8sPrefix, '/');
    this.osPrefix = this.trimLeading(this.pathGet(this.osConfig, ['api', 'openshift', 'prefix']) || this.osPrefix, '/');
  }

  private documentBase() {
    const baseElems: NodeListOf<HTMLBaseElement> = document.getElementsByTagName('base');
    return baseElems.length > 0 ? baseElems.item(0).href : '/';
  }

  private trimLeading(text, prefix) {
    if (text && prefix) {
      if (text.indexOf(prefix) === 0) {
        return text.substring(prefix.length);
      }
    }
    return text;
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
  private pathGet(object: any, paths: any) {
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

}
