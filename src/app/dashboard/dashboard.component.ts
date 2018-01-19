import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="container-fluid cards-pf">
      dashboard
    </div>
  `,
  styles: [
    '.cards-pf { height: 100%; padding-top: 20px; }'
  ]
})
export class DashboardComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
