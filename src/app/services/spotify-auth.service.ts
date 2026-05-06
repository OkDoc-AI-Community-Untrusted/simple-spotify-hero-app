import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  SPOTIFY_AUTH_URL,
  SPOTIFY_TOKEN_URL,
  SPOTIFY_SCOPES,
  TOKEN_REFRESH_BUFFER_MS,
} from '../models/constants';
import { SpotifyTokenResponse } from '../models/spotify.interface';
import { environment } from '../../environments/environment';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  TOKEN_EXPIRY: 'spotify_token_expiry',
  CODE_VERIFIER: 'spotify_code_verifier',
} as const;

export type AuthErrorReason = 'refresh_failed' | 'network_error';

@Injectable({ providedIn: 'root' })
export class SpotifyAuthService {
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * In-flight refresh promise — ensures concurrent callers (e.g. multiple
   * parallel HTTP 401s) all share a single refresh request instead of racing.
   */
  private pendingRefresh: Promise<boolean> | null = null;

  /** Reactive flag for components / guards. Updated whenever tokens change. */
  readonly isAuthenticated$ = new BehaviorSubject<boolean>(this.isAuthenticated());

  /** Emits when authentication is lost (refresh failure, network drop, etc). */
  readonly authError$ = new Subject<AuthErrorReason>();

  constructor(
    private router: Router,
    private ngZone: NgZone,
  ) {
    this.scheduleTokenRefresh();

    // Iframes can be throttled or fully suspended when the host tab is
    // backgrounded — setTimeout may fire late or not at all. When the iframe
    // becomes visible again, re-check expiry and refresh proactively.
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  isAuthenticated(): boolean {
    const token: string | null = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiry: string | null = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!token || !expiry) {
      return false;
    }
    return Date.now() < Number(expiry);
  }

  hasRefreshToken(): boolean {
    return !!localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Resolves to true if the caller can safely make authenticated requests
   * after this call. If the access token is fresh, returns immediately.
   * If it is expired but a refresh token is stored, attempts a refresh.
   * Used by route bootstrap and by the HTTP interceptor on 401.
   */
  async ensureFreshToken(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true;
    }
    if (!this.hasRefreshToken()) {
      return false;
    }
    return this.refreshToken();
  }

  /**
   * Initiates the Spotify PKCE auth flow.
   * Returns true when a popup was opened (iframe context) so the caller
   * can listen for auth completion via postMessage instead of waiting for
   * a page navigation.
   */
  async login(): Promise<boolean> {
    const isIframe = window.self !== window.top;

    // iOS Safari requires window.open() to be called synchronously within a
    // user-gesture handler. If we await anything first (e.g. crypto.subtle.digest
    // for the PKCE challenge), the gesture expires and the popup is silently
    // blocked. So we open the popup NOW with a blank page, then navigate it
    // to the Spotify auth URL once the challenge is ready.
    let popup: Window | null = null;
    if (isIframe) {
      popup = window.open('about:blank', 'spotify_auth', 'width=500,height=700,resizable=yes');
    }

    const codeVerifier: string = this.generateRandomString(64);
    localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);

    const codeChallenge: string = await this.generateCodeChallenge(codeVerifier);

    const params: URLSearchParams = new URLSearchParams({
      response_type: 'code',
      client_id: environment.spotifyClientId,
      scope: SPOTIFY_SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: environment.redirectUri,
    });

    const url = `${SPOTIFY_AUTH_URL}?${params.toString()}`;

    if (isIframe) {
      if (popup && !popup.closed) {
        popup.location.href = url;
      } else {
        // Popup was blocked despite our best effort — try once more as fallback.
        window.open(url, 'spotify_auth', 'width=500,height=700,resizable=yes');
      }
      return true;
    }

    window.location.href = url;
    return false;
  }

  async handleCallback(code: string): Promise<boolean> {
    const codeVerifier: string | null = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
    if (!codeVerifier) {
      return false;
    }

    try {
      const response: Response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: environment.spotifyClientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: environment.redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data: SpotifyTokenResponse = (await response.json()) as SpotifyTokenResponse;
      this.storeTokens(data);
      localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
      this.scheduleTokenRefresh();
      this.isAuthenticated$.next(true);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Refresh the access token. Concurrent callers share a single in-flight
   * request (single-flight). Returns true on success.
   */
  refreshToken(): Promise<boolean> {
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }
    this.pendingRefresh = this.doRefresh().finally(() => {
      this.pendingRefresh = null;
    });
    return this.pendingRefresh;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken: string | null = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      return false;
    }

    let response: Response;
    try {
      response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: environment.spotifyClientId,
        }),
      });
    } catch {
      // Network error — keep tokens (transient), notify listeners.
      this.authError$.next('network_error');
      return false;
    }

    if (!response.ok) {
      // Refresh token rejected by Spotify — irrecoverable, force re-login.
      this.authError$.next('refresh_failed');
      this.logout();
      return false;
    }

    const data: SpotifyTokenResponse = (await response.json()) as SpotifyTokenResponse;
    this.storeTokens(data);
    this.scheduleTokenRefresh();
    this.isAuthenticated$.next(true);
    return true;
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    this.isAuthenticated$.next(false);
    this.ngZone.run(() => {
      this.router.navigate(['/login']);
    });
  }

  private storeTokens(data: SpotifyTokenResponse): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    }
    const expiryMs: number = Date.now() + data.expires_in * 1000;
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryMs.toString());
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }

    const expiry: string | null = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiry) {
      return;
    }

    const msUntilRefresh: number = Number(expiry) - Date.now() - TOKEN_REFRESH_BUFFER_MS;
    if (msUntilRefresh <= 0) {
      this.refreshToken();
      return;
    }

    this.refreshTimerId = setTimeout(() => {
      this.ngZone.run(() => {
        this.refreshToken();
      });
    }, msUntilRefresh);
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    // Iframe just became visible — make sure our token is still fresh.
    if (this.hasRefreshToken() && !this.isAuthenticated()) {
      this.refreshToken();
    }
  };

  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values: Uint8Array = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc: string, x: number) => acc + possible[x % possible.length], '');
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder: TextEncoder = new TextEncoder();
    const data: Uint8Array = encoder.encode(codeVerifier);
    const digest: ArrayBuffer = await window.crypto.subtle.digest('SHA-256', data as BufferSource);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}
