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
      // If opened as a popup (from the iframe login flow), close this window.
      // The login page detects auth via the StorageEvent and navigates to /home.
      if (window.opener && !window.opener.closed) {
        window.close();
        return;
      }
      this.router.navigate(['/home'], { replaceUrl: true });
    } else {
      this.error = 'Failed to exchange authorization code. Please try again.';
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
