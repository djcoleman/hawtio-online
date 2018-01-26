import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';

import { initOpenshiftOAuth } from './init';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    { provide: APP_INITIALIZER, useFactory: () => initOpenshiftOAuth, multi: true },
  ]
})
export class OpenshiftOauthModule { }
