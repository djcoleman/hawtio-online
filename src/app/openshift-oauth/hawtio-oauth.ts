import { Globals } from './globals';

export class HawtioOAuth {

  static getOAuthToken(): string {
    return Globals.userProfile ? Globals.userProfile.getOAuthToken : null;
  }

}
