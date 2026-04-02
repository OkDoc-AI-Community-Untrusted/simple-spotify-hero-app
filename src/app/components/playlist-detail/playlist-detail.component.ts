import { Component, OnInit, OnDestroy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { SpotifyPlaylistService } from '../../services/spotify-playlist.service';
import { SpotifyPlayerService } from '../../services/spotify-player.service';
import { SpotifyPlaylist, SpotifyPlaylistTrack, SpotifyTrack } from '../../models/spotify.interface';

@Component({
  selector: 'app-playlist-detail',
  imports: [IonicModule, CommonModule],
  templateUrl: './playlist-detail.component.html',
  styleUrls: ['./playlist-detail.component.scss'],
})
export class PlaylistDetailComponent implements OnInit, OnDestroy {
  playlist = input.required<SpotifyPlaylist>();
  back = output<void>();

  tracks: SpotifyTrack[] = [];
  isLoading = false;
  currentTrackUri = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private playlistService: SpotifyPlaylistService,
    private playerService: SpotifyPlayerService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.playlistService.currentPlaylistTracks$.subscribe((items: SpotifyPlaylistTrack[]) => {
        this.tracks = items.map((entry: SpotifyPlaylistTrack) => entry.item);
      }),
      this.playlistService.isLoading$.subscribe((loading: boolean) => {
        this.isLoading = loading;
      }),
      this.playerService.currentTrack$.subscribe((track: SpotifyTrack | null) => {
        this.currentTrackUri = track?.uri ?? '';
      }),
    );
    this.playlistService.loadPlaylistTracks(this.playlist().id);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s: Subscription) => s.unsubscribe());
  }

  get trackCount(): number {
    if (!this.isLoading && this.tracks.length > 0) {
      return this.tracks.length;
    }
    return this.playlist().items?.total ?? 0;
  }

  goBack(): void {
    this.back.emit();
  }

  playAll(): void {
    this.playerService.playContextUri(this.playlist().uri);
  }

  playTrack(track: SpotifyTrack): void {
    this.playerService.playContextUri(this.playlist().uri, track.uri);
  }

  getPlaylistImage(): string {
    const images = this.playlist().images;
    return images.length > 0 ? images[0].url : '';
  }

  getAlbumImage(track: SpotifyTrack): string {
    const images = track.album.images;
    return images.length > 1 ? images[1].url : images.length > 0 ? images[0].url : '';
  }

  formatDuration(ms: number): string {
    const minutes: number = Math.floor(ms / 60000);
    const seconds: number = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
