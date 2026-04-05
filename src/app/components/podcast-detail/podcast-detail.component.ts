import { Component, OnInit, OnDestroy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { SpotifyApiService } from '../../apis/spotify.api.service';
import { SpotifyPlayerService } from '../../services/spotify-player.service';
import { SpotifyShow, SpotifyEpisode } from '../../models/spotify.interface';
import { EpisodeListComponent } from '../episode-list/episode-list.component';

@Component({
  selector: 'app-podcast-detail',
  imports: [IonButton, IonIcon, IonSpinner, CommonModule, EpisodeListComponent],
  templateUrl: './podcast-detail.component.html',
  styleUrls: ['./podcast-detail.component.scss'],
})
export class PodcastDetailComponent implements OnInit, OnDestroy {
  podcast = input.required<SpotifyShow>();
  back = output<void>();

  episodes: SpotifyEpisode[] = [];
  isLoading = false;
  currentEpisodeUri = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private spotifyApi: SpotifyApiService,
    private playerService: SpotifyPlayerService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.playerService.currentTrack$.subscribe((track) => {
        // The Web Playback SDK reports episodes the same way as tracks (via track_window)
        this.currentEpisodeUri = track?.uri ?? '';
      }),
    );
    this.loadEpisodes();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s: Subscription) => s.unsubscribe());
  }

  private loadEpisodes(): void {
    this.isLoading = true;
    this.spotifyApi.getShowEpisodes(this.podcast().id).subscribe({
      next: (result) => {
        this.episodes = (result.items ?? []).filter((e): e is SpotifyEpisode => e != null);
        this.isLoading = false;
      },
      error: () => {
        this.episodes = [];
        this.isLoading = false;
      },
    });
  }

  get episodeCount(): number {
    if (!this.isLoading && this.episodes.length > 0) {
      return this.episodes.length;
    }
    return this.podcast().total_episodes;
  }

  get podcastImage(): string {
    const images = this.podcast().images;
    return images.length > 0 ? images[0].url : '';
  }

  goBack(): void {
    this.back.emit();
  }

  playAll(): void {
    this.playerService.setNowPlayingEpisodes(this.episodes);
    this.playerService.playContextUri(this.podcast().uri);
  }

  playEpisode(episode: SpotifyEpisode): void {
    this.playerService.setNowPlayingEpisodes(this.episodes);
    this.playerService.playContextUri(this.podcast().uri, episode.uri);
  }
}
