import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SpotifyApiService } from '../apis/spotify.api.service';
import { SpotifyPlaylist, SpotifyPlaylistTrack } from '../models/spotify.interface';

@Injectable({ providedIn: 'root' })
export class SpotifyPlaylistService {
  readonly playlists$ = new BehaviorSubject<SpotifyPlaylist[]>([]);
  readonly currentPlaylistTracks$ = new BehaviorSubject<SpotifyPlaylistTrack[]>([]);
  readonly isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(private spotifyApi: SpotifyApiService) {}

  loadMyPlaylists(): void {
    this.isLoading$.next(true);
    this.spotifyApi.getMyPlaylists().subscribe({
      next: (result) => {
        this.playlists$.next(result.items);
        this.isLoading$.next(false);
      },
      error: () => {
        this.playlists$.next([]);
        this.isLoading$.next(false);
      },
    });
  }

  loadPlaylistTracks(playlistId: string): void {
    this.isLoading$.next(true);
    this.currentPlaylistTracks$.next([]);
    this.spotifyApi.getPlaylistItems(playlistId).subscribe({
      next: (result) => {
        // Filter out null/unavailable items from the API response
        const items: SpotifyPlaylistTrack[] = (result.items as (SpotifyPlaylistTrack | null)[]).filter(
          (entry): entry is SpotifyPlaylistTrack => entry != null && entry.item != null
        );
        this.currentPlaylistTracks$.next(items);
        this.isLoading$.next(false);
      },
      error: () => {
        this.currentPlaylistTracks$.next([]);
        this.isLoading$.next(false);
      },
    });
  }

  getPlaylistsForTool(): { id: string; name: string; owner: string; trackCount: number }[] {
    return this.playlists$.value.map((p: SpotifyPlaylist) => ({
      id: p.id,
      name: p.name,
      owner: p.owner.display_name,
      trackCount: p.items?.total ?? 0,
    }));
  }
}
