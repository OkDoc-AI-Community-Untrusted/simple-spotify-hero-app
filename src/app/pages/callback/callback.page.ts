import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { SpotifyAuthService } from '../../services/spotify-auth.service';

@Component({
  selector: 'app-callback',
  imports: [IonContent, IonIcon, IonButton, IonSpinner],
  template: `
    <ion-content class="ion-padding ut-flex-center">
      <div class="ut-flex-col ut-align-center ut-gap-16">
        @if (error) {
          <ion-icon name="alert-circle-outline" style="font-size: 48px; color: #e74c3c;"></ion-icon>
          <p style="color: #e74c3c;">{{ error }}</p>
          <ion-button (click)="goToLogin()">Try Again</ion-button>
        } @else {
          <ion-spinner name="crescent" style="width: 48px; height: 48px;"></ion-spinner>
          <p class="app-muted-text">Connecting to Spotify...</p>
        }
      </div>
    </ion-content>
  `,
})
export class CallbackPage implements OnInit {
  error = '';

  constructor(
    private authService: SpotifyAuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  async ngOnInit(): Promise<void> {
    // With HashLocationStrategy, Spotify redirects to /#/callback?code=xxx
    // The query params live inside the hash fragment, so window.location.search
    // is empty. Angular's ActivatedRoute correctly parses them from the hash.
    const queryParams = this.route.snapshot.queryParams;
    const code: string | null = queryParams['code'] ?? null;
    const errorParam: string | null = queryParams['error'] ?? null;

    // Popup flow (opened from an iframe that has partitioned storage):
    // The popup has a DIFFERENT localStorage partition than the iframe, so it
    // cannot find the code_verifier stored by the iframe. Instead, send the
    // code back to the opener (iframe) via postMessage and let the iframe do
    // the token exchange with its own code_verifier.
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'spotify_callback', code, error: errorParam },
        window.location.origin,
      );
      window.close();
      return;
    }

    if (errorParam) {
      this.error = `Authorization denied: ${errorParam}`;
      return;
    }

    if (!code) {
      this.error = 'No authorization code received.';
      return;
    }

    const success: boolean = await this.authService.handleCallback(code);
    if (success) {
      this.router.navigate(['/home'], { replaceUrl: true });
    } else {
      this.error = 'Failed to exchange authorization code. Please try again.';
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
