import { Component, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonList, IonItem, IonThumbnail, IonIcon } from '@ionic/angular/standalone';
import { Subject, Subscription, debounceTime, distinctUntilChanged, filter, tap } from 'rxjs';
import { SpotifySearchService } from '../../services/spotify-search.service';
import { SpotifyPlayerService } from '../../services/spotify-player.service';
import { SpotifyTrack, SpotifyPlaylist } from '../../models/spotify.interface';
import { SEARCH_DEBOUNCE_MS } from '../../models/constants';

@Component({
  selector: 'app-search',
  imports: [IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonList, IonItem, IonThumbnail, IonIcon, CommonModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit, OnDestroy {
  playlistSelected = output<SpotifyPlaylist>();

  trackResults: SpotifyTrack[] = [];
  playlistResults: SpotifyPlaylist[] = [];
  isSearching = false;
  searchTab: 'tracks' | 'playlists' = 'tracks';
  currentTrackUri = '';

  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(
    private searchService: SpotifySearchService,
    private playerService: SpotifyPlayerService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.searchService.trackResults$.subscribe((tracks: SpotifyTrack[]) => {
        this.trackResults = tracks;
      }),
      this.searchService.playlistResults$.subscribe((playlists: SpotifyPlaylist[]) => {
        this.playlistResults = playlists;
      }),
      this.searchService.isSearching$.subscribe((searching: boolean) => {
        this.isSearching = searching;
      }),
      this.playerService.currentTrack$.subscribe((track: SpotifyTrack | null) => {
        this.currentTrackUri = track?.uri ?? '';
      }),
      this.searchSubject.pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        filter((q: string) => q.trim().length > 1),
        tap((query: string) => {
          if (this.searchTab === 'tracks') {
            this.searchService.searchTracks(query);
          } else {
            this.searchService.searchPlaylists(query);
          }
        }),
      ).subscribe(),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s: Subscription) => s.unsubscribe());
  }

  onSearchInput(event: CustomEvent): void {
    const query: string = (event.detail.value as string) ?? '';
    this.searchSubject.next(query);
  }

  onTabChange(event: CustomEvent): void {
    this.searchTab = event.detail.value as 'tracks' | 'playlists';
  }

  playTrack(track: SpotifyTrack): void {
    this.playerService.setNowPlayingList(this.trackResults);
    this.playerService.playContextUri(track.album.uri, track.uri);
  }

  playPlaylist(playlist: SpotifyPlaylist): void {
    this.playlistSelected.emit(playlist);
  }

  getAlbumImage(track: SpotifyTrack): string {
    const images = track.album.images;
    return images.length > 1 ? images[1].url : images.length > 0 ? images[0].url : '';
  }

  getPlaylistImage(playlist: SpotifyPlaylist): string {
    return playlist.images.length > 0 ? playlist.images[0].url : '';
  }

  formatDuration(ms: number): string {
    const minutes: number = Math.floor(ms / 60000);
    const seconds: number = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
