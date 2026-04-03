import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { OkDocService } from './services/okdoc.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class App implements OnInit {
  private okDocService = inject(OkDocService);

  ngOnInit(): void {
    // Initialize OkDoc SDK immediately on page load so the host can discover
    // tool declarations even before the user authenticates.
    this.okDocService.init();
  }
}

