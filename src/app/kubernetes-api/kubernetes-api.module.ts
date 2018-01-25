import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AddPolledTypes, FetchConfig, KubernetesApiConfig, KubernetesApiInit, KubernetesAPIProviderInit } from './init';
import { K8SClientFactory } from './k8s-client-factory';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    { provide: APP_INITIALIZER, useFactory: () => FetchConfig, multi: true },
    { provide: APP_INITIALIZER, useFactory: () => KubernetesApiInit, multi: true },
    { provide: APP_INITIALIZER, useFactory: () => KubernetesApiConfig, multi: true },
    { provide: APP_INITIALIZER, useFactory: () => AddPolledTypes, multi: true },
    { provide: APP_INITIALIZER, useFactory: () => KubernetesAPIProviderInit, multi: true },
    K8SClientFactory
  ]
})
export class KubernetesApiModule { }
