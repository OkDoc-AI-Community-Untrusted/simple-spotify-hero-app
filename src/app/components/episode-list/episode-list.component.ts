import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { IonList, IonItem, IonThumbnail, IonLabel } from '@ionic/angular/standalone';
import { SpotifyEpisode } from '../../models/spotify.interface';

@Component({
  selector: 'app-episode-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonThumbnail, IonLabel],
  template: `
    <ion-list lines="none" class="episode-list">
      @for (episode of episodes(); track episode.id; let i = $index) {
        <ion-item button (click)="episodeClicked.emit(episode)" class="episode-item"
                  [class.now-playing]="episode.uri === currentEpisodeUri()">
          @if (showIndex()) {
            <span class="episode-index app-muted-text" slot="start">{{ i + 1 }}</span>
          }
          @if (getEpisodeImage(episode)) {
            <ion-thumbnail slot="start">
              <img [src]="getEpisodeImage(episode)" [alt]="episode.name">
            </ion-thumbnail>
          }
          <ion-label>
            <h3 class="ut-ellipsis">{{ episode.name }}</h3>
            <p class="app-muted-text ut-ellipsis">
              {{ episode.release_date }} · {{ formatDuration(episode.duration_ms) }}
            </p>
          </ion-label>
        </ion-item>
      }
    </ion-list>
  `,
  styleUrls: ['./episode-list.component.scss'],
})
export class EpisodeListComponent {
  episodes = input.required<SpotifyEpisode[]>();
  currentEpisodeUri = input('');
  showIndex = input(true);
  episodeClicked = output<SpotifyEpisode>();

  getEpisodeImage(episode: SpotifyEpisode): string {
    return episode.images.length > 0 ? episode.images[0].url : '';
  }

  formatDuration(ms: number): string {
    const totalSeconds: number = Math.floor(ms / 1000);
    const hours: number = Math.floor(totalSeconds / 3600);
    const minutes: number = Math.floor((totalSeconds % 3600) / 60);
    const seconds: number = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
