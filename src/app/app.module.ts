import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NavigationModule } from 'patternfly-ng';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { OpenshiftOauthModule } from './openshift-oauth/openshift-oauth.module';
import { KubernetesApiModule } from './kubernetes-api/kubernetes-api.module';
import { CoreModule } from './core/core.module';

@NgModule({
  imports: [
    BrowserModule,
    NavigationModule,
    OpenshiftOauthModule,
    KubernetesApiModule,
    CoreModule,
    AppRoutingModule
  ],
  declarations: [
    AppComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
