import { Injectable, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { SpotifyAuthService } from './spotify-auth.service';
import { SpotifyPlayerService } from './spotify-player.service';
import { SpotifySearchService } from './spotify-search.service';
import { SpotifyPlaylistService } from './spotify-playlist.service';
import { SpotifyTrack } from '../models/spotify.interface';

const AUTH_REQUIRED_MESSAGE = 'Not authenticated. Please open the Spotify Hero App and log in with your Spotify Premium account first.';

@Injectable({ providedIn: 'root' })
export class OkDocService {
  private initialized = false;
  private notifierSubscriptions: Subscription[] = [];

  constructor(
    private authService: SpotifyAuthService,
    private playerService: SpotifyPlayerService,
    private searchService: SpotifySearchService,
    private playlistService: SpotifyPlaylistService,
    private ngZone: NgZone,
  ) {}

  private notAuthenticated() {
    return { content: [{ type: 'text' as const, text: AUTH_REQUIRED_MESSAGE }], isError: true };
  }

  init(): void {
    if (this.initialized) {
      return;
    }

    const OkDoc = (window as any).OkDoc;
    if (typeof OkDoc === 'undefined') {
      return;
    }

    OkDoc.init({
      id: 'simple-spotify-hero-app',
      name: 'Simple Spotify Hero App',
      namespace: 'simple_spotify_hero_app',
      version: '1.0.0',
      description: 'A simple Spotify player with voice control — search, browse playlists, and control playback',
      icon: 'musical-notes-outline',
      mode: 'foreground',
      author: { name: 'OkDoc Community', url: 'https://github.com/okDoc-ai' },
    });

    this.registerSearchTools(OkDoc);
    this.registerPlaybackTools(OkDoc);
    this.registerPlaylistTools(OkDoc);
    this.registerUiTools(OkDoc);
    this.setupNotifiers(OkDoc);

    this.initialized = true;
  }

  private registerSearchTools(OkDoc: any): void {
    OkDoc.registerTool('search_tracks', {
      description: 'Search for tracks on Spotify. Automatically switches the UI to the Search tab (Tracks section). Returns a list of tracks with their IDs, names, artists, and albums.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for tracks' },
        },
        required: ['query'],
      },
      handler: async (args: Record<string, unknown>) => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const query: string = String(args['query']);
        return new Promise<any>((resolve) => {
          this.ngZone.run(() => {
            // searchTracks internally calls navigateToSearchTab('search', 'tracks')
            this.searchService.searchTracks(query);
          });
          // Wait for the loading flag to go true then false
          let started = false;
          const sub = this.searchService.isSearching$.subscribe((searching: boolean) => {
            if (searching) { started = true; return; }
            if (!started) return;
            sub.unsubscribe();
            const results = this.searchService.getTrackResultsForTool();
            resolve({
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              structuredContent: { results },
            });
          });
        });
      },
    });

    OkDoc.registerTool('search_playlists', {
      description: 'Search for playlists on Spotify. Automatically switches the UI to the Search tab (Playlists section). Returns a list of playlists with their IDs, names, owners, and track counts.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for playlists' },
        },
        required: ['query'],
      },
      handler: async (args: Record<string, unknown>) => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const query: string = String(args['query']);
        return new Promise<any>((resolve) => {
          this.ngZone.run(() => {
            // searchPlaylists internally calls navigateToSearchTab('search', 'playlists')
            this.searchService.searchPlaylists(query);
          });
          let started = false;
          const sub = this.searchService.isSearching$.subscribe((searching: boolean) => {
            if (searching) { started = true; return; }
            if (!started) return;
            sub.unsubscribe();
            const results = this.searchService.getPlaylistResultsForTool();
            resolve({
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              structuredContent: { results },
            });
          });
        });
      },
    });
  }

  private registerPlaybackTools(OkDoc: any): void {
    OkDoc.registerTool('play_track', {
      description: 'Play a specific track by its Spotify ID (obtained from search results).',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Spotify track ID' },
        },
        required: ['id'],
      },
      handler: async (args: Record<string, unknown>) => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const id: string = String(args['id']);
        this.ngZone.run(() => {
          this.playerService.playTrackUri(`spotify:track:${id}`);
        });
        return { content: [{ type: 'text', text: `Playing track ${id}` }] };
      },
    });

    OkDoc.registerTool('play', {
      description: 'Resume playback of the current track.',
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        this.ngZone.run(() => {
          this.playerService.resume();
        });
        return { content: [{ type: 'text', text: 'Playback resumed.' }] };
      },
    });

    OkDoc.registerTool('pause', {
      description: 'Pause the current playback.',
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        this.ngZone.run(() => {
          this.playerService.pause();
        });
        return { content: [{ type: 'text', text: 'Playback paused.' }] };
      },
    });

    OkDoc.registerTool('next_track', {
      description: 'Skip to the next track.',
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        this.ngZone.run(() => {
          this.playerService.nextTrack();
        });
        return { content: [{ type: 'text', text: 'Skipped to next track.' }] };
      },
    });

    OkDoc.registerTool('previous_track', {
      description: 'Go back to the previous track.',
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        this.ngZone.run(() => {
          this.playerService.previousTrack();
        });
        return { content: [{ type: 'text', text: 'Went to previous track.' }] };
      },
    });

    OkDoc.registerTool('seek', {
      description: 'Seek to a specific position in the current track.',
      inputSchema: {
        type: 'object',
        properties: {
          position_seconds: { type: 'number', description: 'Position in seconds to seek to' },
        },
        required: ['position_seconds'],
      },
      handler: async (args: Record<string, unknown>) => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const posMs: number = Number(args['position_seconds']) * 1000;
        this.ngZone.run(() => {
          this.playerService.seek(posMs);
        });
        return { content: [{ type: 'text', text: `Seeked to ${args['position_seconds']} seconds.` }] };
      },
    });

    OkDoc.registerTool('set_volume', {
      description: 'Set the playback volume (0 to 100).',
      inputSchema: {
        type: 'object',
        properties: {
          volume: { type: 'number', minimum: 0, maximum: 100, description: 'Volume level (0-100)' },
        },
        required: ['volume'],
      },
      handler: async (args: Record<string, unknown>) => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const vol: number = Number(args['volume']);
        this.ngZone.run(() => {
          this.playerService.setVolume(vol);
        });
        return { content: [{ type: 'text', text: `Volume set to ${vol}%.` }] };
      },
    });

    OkDoc.registerTool('toggle_shuffle', {
      description: 'Toggle shuffle mode on or off.',
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        this.ngZone.run(() => {
          this.playerService.toggleShuffle();
        });
        const state: boolean = !this.playerService.shuffle$.value;
        return { content: [{ type: 'text', text: `Shuffle ${state ? 'enabled' : 'disabled'}.` }] };
      },
    });

    OkDoc.registerTool('volume_up', {
      description: 'Increase the playback volume by 10%.',
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const current: number = this.playerService.volume$.value;
        const newVol: number = Math.min(100, current + 10);
        this.ngZone.run(() => {
          this.playerService.setVolume(newVol);
        });
        return { content: [{ type: 'text', text: `Volume increased to ${newVol}%.` }] };
      },
    });

    OkDoc.registerTool('volume_down', {
      description: 'Decrease the playback volume by 10%.',
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const current: number = this.playerService.volume$.value;
        const newVol: number = Math.max(0, current - 10);
        this.ngZone.run(() => {
          this.playerService.setVolume(newVol);
        });
        return { content: [{ type: 'text', text: `Volume decreased to ${newVol}%.` }] };
      },
    });

    OkDoc.registerTool('toggle_favorite', {
      description: 'Save or remove the current track from your library.',
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const wasFavorited: boolean = this.playerService.isFavorited$.value;
        this.ngZone.run(() => {
          this.playerService.toggleFavorite();
        });
        return {
          content: [{ type: 'text', text: wasFavorited ? 'Track removed from library.' : 'Track saved to library.' }],
        };
      },
    });

    OkDoc.registerTool('get_playback_state', {
      description: 'Get the current playback state including track info, position, volume, and shuffle status.',
      annotations: { readOnlyHint: true },
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const track: SpotifyTrack | null = this.playerService.currentTrack$.value;
        const state = {
          isPlaying: this.playerService.isPlaying$.value,
          track: track ? {
            id: track.id,
            name: track.name,
            artist: track.artists.map((a) => a.name).join(', '),
            album: track.album.name,
          } : null,
          positionSeconds: Math.round(this.playerService.positionMs$.value / 1000),
          durationSeconds: Math.round(this.playerService.durationMs$.value / 1000),
          volume: this.playerService.volume$.value,
          shuffle: this.playerService.shuffle$.value,
          isFavorited: this.playerService.isFavorited$.value,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(state, null, 2) }],
          structuredContent: state,
        };
      },
    });
  }

  private registerPlaylistTools(OkDoc: any): void {
    OkDoc.registerTool('get_my_playlists', {
      description: 'Get the current user\'s playlists with IDs, names, owners, and track counts.',
      annotations: { readOnlyHint: true },
      handler: async () => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        return new Promise<any>((resolve) => {
          this.ngZone.run(() => { this.playlistService.loadMyPlaylists(); });
          let started = false;
          const sub = this.playlistService.isLoading$.subscribe((loading: boolean) => {
            if (loading) { started = true; return; }
            if (!started) return;
            sub.unsubscribe();
            const results = this.playlistService.getPlaylistsForTool();
            resolve({
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              structuredContent: { results },
            });
          });
        });
      },
    });

    OkDoc.registerTool('play_playlist', {
      description: 'Play a specific playlist by its Spotify ID.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Spotify playlist ID' },
        },
        required: ['id'],
      },
      handler: async (args: Record<string, unknown>) => {
        if (!this.authService.isAuthenticated()) return this.notAuthenticated();
        const id: string = String(args['id']);
        this.ngZone.run(() => {
          this.playerService.playContextUri(`spotify:playlist:${id}`);
        });
        return { content: [{ type: 'text', text: `Playing playlist ${id}` }] };
      },
    });
  }

  private registerUiTools(OkDoc: any): void {
    OkDoc.registerTool('switch_search_tab', {
      description: 'Switch the UI to the Search page and select either the Tracks or Playlists section within it.',
      inputSchema: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['tracks', 'playlists'],
            description: 'Which section to show in the Search tab: "tracks" or "playlists"',
          },
        },
        required: ['section'],
      },
      handler: async (args: Record<string, unknown>) => {
        const section = String(args['section']) as 'tracks' | 'playlists';
        this.ngZone.run(() => {
          this.searchService.navigateToSearchTab('search', section);
        });
        return { content: [{ type: 'text', text: `Switched to Search tab — ${section} section.` }] };
      },
    });

    OkDoc.registerTool('expand_player', {
      description: 'Expand the player to show full playback controls, album art, and the seek/volume sliders.',
      handler: async () => {
        if (!this.playerService.currentTrack$.value) {
          return { content: [{ type: 'text', text: 'No track is currently loaded.' }], isError: true };
        }
        this.ngZone.run(() => {
          this.playerService.isPlayerExpanded$.next(true);
        });
        return { content: [{ type: 'text', text: 'Player expanded.' }] };
      },
    });

    OkDoc.registerTool('collapse_player', {
      description: 'Collapse the player back to the mini player bar at the bottom.',
      handler: async () => {
        this.ngZone.run(() => {
          this.playerService.isPlayerExpanded$.next(false);
        });
        return { content: [{ type: 'text', text: 'Player collapsed.' }] };
      },
    });
  }

  private setupNotifiers(OkDoc: any): void {
    // Notify on track change
    this.notifierSubscriptions.push(
      this.playerService.currentTrack$.subscribe((track: SpotifyTrack | null) => {
        if (track) {
          const artistNames: string = track.artists.map((a) => a.name).join(', ');
          OkDoc.notify(`Now playing: "${track.name}" by ${artistNames}`);
        }
      }),
    );

    // Notify on playback state changes
    this.notifierSubscriptions.push(
      this.playerService.isPlaying$.subscribe((isPlaying: boolean) => {
        if (this.playerService.currentTrack$.value) {
          OkDoc.notify(`Playback ${isPlaying ? 'resumed' : 'paused'}.`);
        }
      }),
    );
  }
}
