import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';

import { addPolledTypes, fetchConfig, kubernetesApiConfig, kubernetesApiInit, kubernetesAPIProviderInit } from './init';
import { K8SClientFactory } from './k8s-client-factory';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    { provide: APP_INITIALIZER, useFactory: () => fetchConfig, multi: true },
    { provide: APP_INITIALIZER, useFactory: () => kubernetesApiInit, multi: true },
    { provide: APP_INITIALIZER, useFactory: () => kubernetesApiConfig, multi: true },
    { provide: APP_INITIALIZER, useFactory: () => addPolledTypes, multi: true },
    { provide: APP_INITIALIZER, useFactory: () => kubernetesAPIProviderInit, multi: true },
    K8SClientFactory
  ]
})
export class KubernetesApiModule { }
