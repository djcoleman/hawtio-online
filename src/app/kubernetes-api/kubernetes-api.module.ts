import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AddPolledTypes, FetchConfig, KubernetesApiConfig, KubernetesApiInit, KubernetesAPIProviderInit } from './init';

function buildProviders(): any[] {
  const initFunctions = [
    FetchConfig,
    KubernetesApiInit,
    KubernetesApiConfig,
    AddPolledTypes,
    KubernetesAPIProviderInit
  ];
  return initFunctions.map(initFunction => ({
    provide: APP_INITIALIZER,
    useFactory: () => initFunction,
    multi: true
  }));
}

@NgModule({
  imports: [
    CommonModule
  ],
  providers: buildProviders()
})
export class KubernetesApiModule { }
