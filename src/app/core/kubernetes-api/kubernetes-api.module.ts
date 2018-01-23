import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InitService } from './init.service';

function buildInitializer(factory: Function) {
  return {
    provide: APP_INITIALIZER,
    useFactory: factory,
    deps: [InitService],
    multi: true
  };
}

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    InitService,
    buildInitializer(initService => () => initService.initMasterUrl()),
    buildInitializer(initService => () => initService.detectOpenShift()),
    buildInitializer(initService => () => initService.addPolledTypes()),
    buildInitializer(initService => () => initService.initPrefixes())
  ]
})
export class KubernetesApiModule { }
