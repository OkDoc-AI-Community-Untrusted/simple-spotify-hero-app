import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SpotifyAuthService } from '../../services/spotify-auth.service';
import { SpotifyPlayerService } from '../../services/spotify-player.service';
import { SpotifyPlaylistService } from '../../services/spotify-playlist.service';
import { SpotifySearchService } from '../../services/spotify-search.service';
import { PlayerComponent } from '../../components/player/player.component';
import { SearchComponent } from '../../components/search/search.component';
import { PlaylistsComponent } from '../../components/playlists/playlists.component';
import { PlaylistDetailComponent } from '../../components/playlist-detail/playlist-detail.component';
import { PodcastDetailComponent } from '../../components/podcast-detail/podcast-detail.component';
import { SpotifyPlaylist, SpotifyTrack, SpotifyShow } from '../../models/spotify.interface';

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
    PodcastDetailComponent,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  activeTab: 'playlists' | 'search' = 'playlists';
  selectedPlaylist: SpotifyPlaylist | null = null;
  selectedPodcast: SpotifyShow | null = null;
  hasCurrentTrack = false;

  private readonly subscriptions: Subscription[] = [];

  constructor(
    private authService: SpotifyAuthService,
    private playerService: SpotifyPlayerService,
    private playlistService: SpotifyPlaylistService,
    private searchService: SpotifySearchService,
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
    this.subscriptions.push(
      this.playerService.currentTrack$.subscribe((track: SpotifyTrack | null) => {
        this.hasCurrentTrack = !!track;
      }),
      // Switch home tab when a tool triggers navigation
      this.searchService.requestedHomeTab$.subscribe((tab: 'playlists' | 'search' | null) => {
        if (tab !== null) {
          this.activeTab = tab;
          this.selectedPlaylist = null;
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s: Subscription) => s.unsubscribe());
    this.playerService.destroy();
  }

  onTabChanged(event: CustomEvent): void {
    this.activeTab = event.detail.value as 'playlists' | 'search';
    this.selectedPlaylist = null;
    this.selectedPodcast = null;
  }

  onPlaylistSelected(playlist: SpotifyPlaylist): void {
    this.selectedPlaylist = playlist;
    this.selectedPodcast = null;
  }

  onPlaylistBack(): void {
    this.selectedPlaylist = null;
  }

  onPodcastSelected(show: SpotifyShow): void {
    this.selectedPodcast = show;
    this.selectedPlaylist = null;
  }

  onPodcastBack(): void {
    this.selectedPodcast = null;
  }

  refresh(): void {
    this.playlistService.loadMyPlaylists();
  }

  logout(): void {
    this.playerService.destroy();
    this.authService.logout();
  }
}
