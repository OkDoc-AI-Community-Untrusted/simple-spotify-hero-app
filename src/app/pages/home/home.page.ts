import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { SpotifyAuthService } from '../../services/spotify-auth.service';
import { SpotifyPlayerService } from '../../services/spotify-player.service';
import { SpotifyPlaylistService } from '../../services/spotify-playlist.service';
import { PlayerComponent } from '../../components/player/player.component';
import { SearchComponent } from '../../components/search/search.component';
import { PlaylistsComponent } from '../../components/playlists/playlists.component';
import { PlaylistDetailComponent } from '../../components/playlist-detail/playlist-detail.component';
import { SpotifyPlaylist, SpotifyTrack } from '../../models/spotify.interface';

@Component({
  selector: 'app-home',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonSegment, IonSegmentButton, IonLabel, IonContent,
    CommonModule,
    PlayerComponent,
    SearchComponent,
    PlaylistsComponent,
    PlaylistDetailComponent,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  activeTab: 'playlists' | 'search' = 'playlists';
  selectedPlaylist: SpotifyPlaylist | null = null;
  hasCurrentTrack = false;

  constructor(
    private authService: SpotifyAuthService,
    private playerService: SpotifyPlayerService,
    private playlistService: SpotifyPlaylistService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Initialize services
    this.playerService.initPlayer();
    this.playlistService.loadMyPlaylists();

    // Track whether we have a current track for showing the player bar
    this.playerService.currentTrack$.subscribe((track: SpotifyTrack | null) => {
      this.hasCurrentTrack = !!track;
    });
  }

  ngOnDestroy(): void {
    this.playerService.destroy();
  }

  onTabChanged(event: CustomEvent): void {
    this.activeTab = event.detail.value as 'playlists' | 'search';
    this.selectedPlaylist = null;
  }

  onPlaylistSelected(playlist: SpotifyPlaylist): void {
    this.selectedPlaylist = playlist;
  }

  onPlaylistBack(): void {
    this.selectedPlaylist = null;
  }

  refresh(): void {
    this.playlistService.loadMyPlaylists();
  }

  logout(): void {
    this.playerService.destroy();
    this.authService.logout();
  }
}
