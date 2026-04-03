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
    this.removeStorageListener();
  }

  async login(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    const isPopup = await this.authService.login();

    if (isPopup) {
      // Popup was opened for OAuth. Listen for localStorage being written by
      // the callback page (which runs in the popup) to detect auth completion.
      this.storageHandler = (event: StorageEvent) => {
        if (event.key === 'spotify_access_token' && event.newValue) {
          this.removeStorageListener();
          this.ngZone.run(() => {
            this.isLoading = false;
            this.router.navigate(['/home']);
          });
        }
      };
      window.addEventListener('storage', this.storageHandler);
    }
    // If not popup, the page navigates away — no further action needed here.
  }

  private removeStorageListener(): void {
    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
  }
}
