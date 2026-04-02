import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SpotifyApiService } from '../apis/spotify.api.service';
import { SpotifyAuthService } from './spotify-auth.service';
import { SpotifyTrack } from '../models/spotify.interface';
import { PLAYER_NAME, DEFAULT_VOLUME, POSITION_POLL_INTERVAL_MS } from '../models/constants';

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

@Injectable({ providedIn: 'root' })
export class SpotifyPlayerService {
  private player: Spotify.Player | null = null;
  private positionTimer: ReturnType<typeof setInterval> | null = null;
  private wasPlaying = false;

  deviceId: string = '';

  readonly currentTrack$ = new BehaviorSubject<SpotifyTrack | null>(null);
  readonly isPlaying$ = new BehaviorSubject<boolean>(false);
  readonly positionMs$ = new BehaviorSubject<number>(0);
  readonly durationMs$ = new BehaviorSubject<number>(0);
  readonly volume$ = new BehaviorSubject<number>(DEFAULT_VOLUME * 100);
  readonly shuffle$ = new BehaviorSubject<boolean>(false);
  readonly isFavorited$ = new BehaviorSubject<boolean>(false);
  readonly isReady$ = new BehaviorSubject<boolean>(false);

  constructor(
    private spotifyApi: SpotifyApiService,
    private authService: SpotifyAuthService,
    private ngZone: NgZone,
  ) {}

  initPlayer(): void {
    if (this.player) {
      return;
    }

    const token: string | null = this.authService.getAccessToken();
    if (!token) {
      return;
    }

    if (window.Spotify) {
      this.createPlayer(token);
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        this.ngZone.run(() => {
          this.createPlayer(token);
        });
      };
      this.loadSpotifySdk();
    }
  }

  private loadSpotifySdk(): void {
    if (document.getElementById('spotify-sdk-script')) {
      return;
    }
    const script: HTMLScriptElement = document.createElement('script');
    script.id = 'spotify-sdk-script';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    document.head.appendChild(script);
  }

  private createPlayer(token: string): void {
    this.player = new window.Spotify.Player({
      name: PLAYER_NAME,
      getOAuthToken: (cb: (token: string) => void) => {
        const currentToken: string | null = this.authService.getAccessToken();
        if (currentToken) {
          cb(currentToken);
        }
      },
      volume: DEFAULT_VOLUME,
    });

    this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
      this.ngZone.run(() => {
        this.deviceId = device_id;
        this.isReady$.next(true);
      });
    });

    this.player.addListener('not_ready', () => {
      this.ngZone.run(() => {
        this.deviceId = '';
        this.isReady$.next(false);
      });
    });

    this.player.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
      this.ngZone.run(() => {
        if (!state) {
          return;
        }
        this.handleStateChange(state);
      });
    });

    this.player.activateElement();
    this.player.connect();
  }

  private handleStateChange(state: Spotify.PlaybackState): void {
    const track: Spotify.Track = state.track_window.current_track;
    const spotifyTrack: SpotifyTrack = {
      id: track.id ?? '',
      name: track.name,
      uri: track.uri,
      duration_ms: track.duration_ms,
      artists: track.artists.map((a: Spotify.Artist) => ({ id: a.uri, name: a.name, uri: a.uri })),
      album: {
        id: track.album.uri,
        name: track.album.name,
        images: track.album.images.map((img: Spotify.Image) => ({
          url: img.url,
          height: img.height ?? null,
          width: img.width ?? null,
        })),
        uri: track.album.uri,
      },
    };

    const prevTrackId: string = this.currentTrack$.value?.id ?? '';
    this.currentTrack$.next(spotifyTrack);
    this.isPlaying$.next(!state.paused);
    this.positionMs$.next(state.position);
    this.durationMs$.next(state.duration);
    this.shuffle$.next(state.shuffle);

    if (!state.paused) {
      this.startPositionPolling();
    } else {
      this.stopPositionPolling();
    }

    // Check favorite status when track changes
    if (spotifyTrack.id && spotifyTrack.id !== prevTrackId) {
      this.checkFavoriteStatus(spotifyTrack.id);
    }

    // Auto-advance: detect when playback ended (was playing, now paused, no next tracks)
    if (
      state.paused &&
      this.wasPlaying &&
      state.track_window.next_tracks.length === 0 &&
      (state.position === 0 || state.position >= state.duration - 500)
    ) {
      this.wasPlaying = false;
      this.nextTrack();
    } else {
      this.wasPlaying = !state.paused;
    }
  }

  private startPositionPolling(): void {
    this.stopPositionPolling();
    this.positionTimer = setInterval(() => {
      if (this.player) {
        this.player.getCurrentState().then((state: Spotify.PlaybackState | null) => {
          if (state) {
            this.ngZone.run(() => {
              this.positionMs$.next(state.position);
            });
          }
        });
      }
    }, POSITION_POLL_INTERVAL_MS);
  }

  private stopPositionPolling(): void {
    if (this.positionTimer) {
      clearInterval(this.positionTimer);
      this.positionTimer = null;
    }
  }

  private checkFavoriteStatus(trackId: string): void {
    this.spotifyApi.checkLibraryContains([trackId]).subscribe({
      next: (result: boolean[]) => {
        this.isFavorited$.next(result[0] ?? false);
      },
      error: () => {
        this.isFavorited$.next(false);
      },
    });
  }

  togglePlay(): void {
    if (this.player) {
      this.player.togglePlay();
    }
  }

  resume(): void {
    if (this.player) {
      this.player.resume();
    }
  }

  pause(): void {
    if (this.player) {
      this.player.pause();
    }
  }

  nextTrack(): void {
    if (this.deviceId) {
      this.spotifyApi.next(this.deviceId).subscribe();
    }
  }

  previousTrack(): void {
    if (this.deviceId) {
      this.spotifyApi.previous(this.deviceId).subscribe();
    }
  }

  seek(positionMs: number): void {
    if (this.player) {
      this.player.seek(positionMs);
    }
  }

  setVolume(percent: number): void {
    const vol: number = Math.max(0, Math.min(100, percent));
    if (this.player) {
      this.player.setVolume(vol / 100).then(() => {
        this.volume$.next(vol);
      });
    }
  }

  toggleShuffle(): void {
    if (!this.deviceId) {
      return;
    }
    const newState: boolean = !this.shuffle$.value;
    this.spotifyApi.setShuffle(newState, this.deviceId).subscribe({
      next: () => {
        this.shuffle$.next(newState);
      },
    });
  }

  toggleFavorite(): void {
    const track: SpotifyTrack | null = this.currentTrack$.value;
    if (!track) {
      return;
    }
    const isSaved: boolean = this.isFavorited$.value;
    const obs = isSaved
      ? this.spotifyApi.removeFromLibrary([track.id])
      : this.spotifyApi.saveToLibrary([track.id]);
    obs.subscribe({
      next: () => {
        this.isFavorited$.next(!isSaved);
      },
    });
  }

  playTrackUri(uri: string): void {
    if (!this.deviceId) {
      return;
    }
    this.spotifyApi.play(this.deviceId, { uris: [uri] }).subscribe();
  }

  playContextUri(contextUri: string, offsetUri?: string): void {
    if (!this.deviceId) {
      return;
    }
    const body: Record<string, unknown> = { context_uri: contextUri };
    if (offsetUri) {
      body['offset'] = { uri: offsetUri };
    }
    this.spotifyApi.play(this.deviceId, body).subscribe();
  }

  destroy(): void {
    this.stopPositionPolling();
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
  }
}
