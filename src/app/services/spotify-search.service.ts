import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SpotifyApiService } from '../apis/spotify.api.service';
import { SpotifyTrack, SpotifyPlaylist, SpotifyShow } from '../models/spotify.interface';

export interface SearchResults {
  tracks: SpotifyTrack[];
  playlists: SpotifyPlaylist[];
}

@Injectable({ providedIn: 'root' })
export class SpotifySearchService {
  readonly trackResults$ = new BehaviorSubject<SpotifyTrack[]>([]);
  readonly playlistResults$ = new BehaviorSubject<SpotifyPlaylist[]>([]);
  readonly podcastResults$ = new BehaviorSubject<SpotifyShow[]>([]);
  readonly isSearching$ = new BehaviorSubject<boolean>(false);
  /** Emits the home-level tab that should be activated (null = no navigation) */
  readonly requestedHomeTab$ = new BehaviorSubject<'playlists' | 'search' | null>(null);
  /** Emits the search-sub-tab that should be activated (null = no navigation) */
  readonly requestedSearchTab$ = new BehaviorSubject<'tracks' | 'playlists' | 'podcasts' | null>(null);

  constructor(private spotifyApi: SpotifyApiService) {}

  navigateToSearchTab(homeTab: 'playlists' | 'search', searchTab: 'tracks' | 'playlists' | 'podcasts'): void {
    this.requestedHomeTab$.next(homeTab);
    this.requestedSearchTab$.next(searchTab);
  }

  searchTracks(query: string): void {
    if (!query.trim()) {
      this.trackResults$.next([]);
      return;
    }
    this.navigateToSearchTab('search', 'tracks');
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
    this.navigateToSearchTab('search', 'playlists');
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

  searchPodcasts(query: string): void {
    if (!query.trim()) {
      this.podcastResults$.next([]);
      return;
    }
    this.navigateToSearchTab('search', 'podcasts');
    this.isSearching$.next(true);
    this.spotifyApi.search(query, 'show').subscribe({
      next: (result) => {
        const shows: SpotifyShow[] = (result.shows?.items ?? []).filter((s): s is SpotifyShow => s != null && s.id != null);
        this.podcastResults$.next(shows);
        this.isSearching$.next(false);
      },
      error: () => {
        this.podcastResults$.next([]);
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

  getPodcastResultsForTool(): { id: string; name: string; publisher: string; totalEpisodes: number }[] {
    return this.podcastResults$.value.map((s: SpotifyShow) => ({
      id: s.id,
      name: s.name,
      publisher: s.publisher,
      totalEpisodes: s.total_episodes,
    }));
  }
}
