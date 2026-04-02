import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SpotifyApiService } from '../apis/spotify.api.service';
import { SpotifyPlaylist, SpotifyPlaylistTrack, SpotifyTrack } from '../models/spotify.interface';

@Injectable({ providedIn: 'root' })
export class SpotifyPlaylistService {
  readonly playlists$ = new BehaviorSubject<SpotifyPlaylist[]>([]);
  readonly currentPlaylistTracks$ = new BehaviorSubject<SpotifyTrack[]>([]);
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
        const tracks: SpotifyTrack[] = (result.items as (SpotifyPlaylistTrack | null)[])
          .filter((entry): entry is SpotifyPlaylistTrack => entry != null && entry.item != null)
          .map((entry: SpotifyPlaylistTrack) => entry.item);
        this.currentPlaylistTracks$.next(tracks);
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
