import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <pfng-vertical-navigation [items]="items">
    </pfng-vertical-navigation>
    <div class="container-pf-nav-pf-vertical">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    '.container-pf-nav-pf-vertical { height: 100%; }'
  ]
})
export class AppComponent {
  items = [
    {
      title: 'Dashboard',
      iconStyleClass: 'fa fa-dashboard',
      url: '/dashboard'
    },
    {
      title: 'Pods',
      iconStyleClass: 'fa fa-cube',
      url: '/pods'
    }
  ];
}
