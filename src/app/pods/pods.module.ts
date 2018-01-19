import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PodsRoutingModule } from './pods-routing.module';
import { PodListComponent } from './pod-list.component';

@NgModule({
  imports: [
    CommonModule,
    PodsRoutingModule
  ],
  declarations: [PodListComponent]
})
export class PodsModule { }
