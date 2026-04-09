import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
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

@Injectable({ providedIn: 'root' })
export class SpotifyAuthService {
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private router: Router,
    private ngZone: NgZone,
  ) {
    this.scheduleTokenRefresh();
  }

  isAuthenticated(): boolean {
    const token: string | null = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiry: string | null = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!token || !expiry) {
      return false;
    }
    return Date.now() < Number(expiry);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Initiates the Spotify PKCE auth flow.
   * Returns true when a popup was opened (iframe context) so the caller
   * can listen for auth completion via the storage event instead of
   * waiting for a page navigation.
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

      const data: SpotifyTokenResponse = await response.json() as SpotifyTokenResponse;
      this.storeTokens(data);
      localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
      this.scheduleTokenRefresh();
      return true;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken: string | null = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      return false;
    }

    try {
      const response: Response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: environment.spotifyClientId,
        }),
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data: SpotifyTokenResponse = await response.json() as SpotifyTokenResponse;
      this.storeTokens(data);
      this.scheduleTokenRefresh();
      return true;
    } catch {
      return false;
    }
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
