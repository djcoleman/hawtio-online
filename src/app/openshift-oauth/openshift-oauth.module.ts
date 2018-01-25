import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OpenshiftOauthService } from './openshift-oauth.service';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    OpenshiftOauthService
  ]
})
export class OpenshiftOauthModule { }
