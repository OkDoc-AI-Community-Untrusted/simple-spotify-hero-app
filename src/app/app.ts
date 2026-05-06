import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { OkDocService } from './services/okdoc.service';
import { SpotifyAuthService } from './services/spotify-auth.service';

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
  private authService = inject(SpotifyAuthService);

  ngOnInit(): void {
    // Initialize OkDoc SDK immediately on page load so the host can discover
    // tool declarations even before the user authenticates.
    this.okDocService.init();

    // If a refresh token is stored but the access token is expired, refresh
    // it proactively so route guards (LoginPage / HomePage) don't bounce the
    // user back to the login screen on iframe reload.
    void this.authService.ensureFreshToken();
  }
}

