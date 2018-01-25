import { Injectable } from '@angular/core';

import { Globals } from './globals';

@Injectable()
export class OpenshiftOauthService {

  getOAuthToken() {
    const userProfile = Globals.userProfile;
    return userProfile ? userProfile.token : null;
  }

}
