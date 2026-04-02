import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SpotifyApiService } from '../apis/spotify.api.service';
import { SpotifyTrack, SpotifyPlaylist } from '../models/spotify.interface';

export interface SearchResults {
  tracks: SpotifyTrack[];
  playlists: SpotifyPlaylist[];
}

@Injectable({ providedIn: 'root' })
export class SpotifySearchService {
  readonly trackResults$ = new BehaviorSubject<SpotifyTrack[]>([]);
  readonly playlistResults$ = new BehaviorSubject<SpotifyPlaylist[]>([]);
  readonly isSearching$ = new BehaviorSubject<boolean>(false);

  constructor(private spotifyApi: SpotifyApiService) {}

  searchTracks(query: string): void {
    if (!query.trim()) {
      this.trackResults$.next([]);
      return;
    }
    this.isSearching$.next(true);
    this.spotifyApi.search(query, 'track').subscribe({
      next: (result) => {
        const tracks: SpotifyTrack[] = (result.tracks?.items ?? []).filter((t): t is SpotifyTrack => t != null);
        this.trackResults$.next(tracks);
        this.isSearching$.next(false);
      },
      error: () => {
        this.trackResults$.next([]);
        this.isSearching$.next(false);
      },
    });
  }

  searchPlaylists(query: string): void {
    if (!query.trim()) {
      this.playlistResults$.next([]);
      return;
    }
    this.isSearching$.next(true);
    this.spotifyApi.search(query, 'playlist').subscribe({
      next: (result) => {
        const playlists: SpotifyPlaylist[] = (result.playlists?.items ?? []).filter((p): p is SpotifyPlaylist => p != null && p.id != null);
        this.playlistResults$.next(playlists);
        this.isSearching$.next(false);
      },
      error: () => {
        this.playlistResults$.next([]);
        this.isSearching$.next(false);
      },
    });
  }

  getTrackResultsForTool(): { id: string; name: string; artist: string; album: string }[] {
    return this.trackResults$.value.map((t: SpotifyTrack) => ({
      id: t.id,
      name: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album.name,
    }));
  }

  getPlaylistResultsForTool(): { id: string; name: string; owner: string; trackCount: number }[] {
    return this.playlistResults$.value.map((p: SpotifyPlaylist) => ({
      id: p.id,
      name: p.name,
      owner: p.owner.display_name,
      trackCount: p.items?.total ?? 0,
    }));
  }
}
