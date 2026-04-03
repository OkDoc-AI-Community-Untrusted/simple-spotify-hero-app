import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, IonText, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { SpotifyAuthService } from '../../services/spotify-auth.service';

@Component({
  selector: 'app-login',
  imports: [IonContent, IonIcon, IonText, IonButton, IonSpinner],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';

  private storageHandler: ((e: StorageEvent) => void) | null = null;
  private messageHandler: ((e: MessageEvent) => void) | null = null;

  constructor(
    private authService: SpotifyAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnDestroy(): void {
    this.removeListeners();
  }

  async login(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    const isPopup = await this.authService.login();

    if (isPopup) {
      // The popup runs in a different storage partition (third-party iframe context).
      // It will postMessage the auth code back here; we then do the token exchange
      // ourselves using the code_verifier we stored in our own localStorage.
      this.messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || event.data.type !== 'spotify_callback') return;

        this.removeListeners();

        if (event.data.error) {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.errorMessage = `Authorization denied: ${event.data.error}`;
          });
          return;
        }

        if (!event.data.code) {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.errorMessage = 'No authorization code received.';
          });
          return;
        }

        const success = await this.authService.handleCallback(event.data.code);
        this.ngZone.run(() => {
          this.isLoading = false;
          if (success) {
            this.router.navigate(['/home']);
          } else {
            this.errorMessage = 'Failed to connect to Spotify. Please try again.';
          }
        });
      };
      window.addEventListener('message', this.messageHandler);
    }
    // If not popup, the page navigates away — no further action needed here.
  }

  private removeListeners(): void {
    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
}
