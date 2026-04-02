import { Component, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { SpotifyPlaylistService } from '../../services/spotify-playlist.service';
import { SpotifyPlaylist } from '../../models/spotify.interface';

@Component({
  selector: 'app-playlists',
  imports: [IonicModule, CommonModule],
  templateUrl: './playlists.component.html',
  styleUrls: ['./playlists.component.scss'],
})
export class PlaylistsComponent implements OnInit, OnDestroy {
  playlistSelected = output<SpotifyPlaylist>();

  playlists: SpotifyPlaylist[] = [];
  isLoading = false;

  private subscriptions: Subscription[] = [];

  constructor(private playlistService: SpotifyPlaylistService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.playlistService.playlists$.subscribe((pl: SpotifyPlaylist[]) => {
        this.playlists = pl;
      }),
      this.playlistService.isLoading$.subscribe((loading: boolean) => {
        this.isLoading = loading;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s: Subscription) => s.unsubscribe());
  }

  selectPlaylist(playlist: SpotifyPlaylist): void {
    this.playlistSelected.emit(playlist);
  }

  getPlaylistImage(playlist: SpotifyPlaylist): string {
    return playlist.images.length > 0 ? playlist.images[0].url : '';
  }
}
