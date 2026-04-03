import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  ) {}

  async ngOnInit(): Promise<void> {
    const params: URLSearchParams = new URLSearchParams(window.location.search);
    const code: string | null = params.get('code');
    const errorParam: string | null = params.get('error');

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
