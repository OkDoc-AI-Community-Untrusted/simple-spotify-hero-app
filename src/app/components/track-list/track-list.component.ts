import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { IonList, IonItem, IonThumbnail, IonLabel } from '@ionic/angular/standalone';
import { SpotifyTrack } from '../../models/spotify.interface';

@Component({
  selector: 'app-track-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonThumbnail, IonLabel],
  template: `
    <ion-list lines="none" class="track-list">
      @for (track of tracks(); track $index; let i = $index) {
        <ion-item button (click)="trackClicked.emit(track)" class="track-item"
                  [class.now-playing]="track.uri === currentTrackUri()">
          @if (showIndex()) {
            <span class="track-index app-muted-text" slot="start">{{ i + 1 }}</span>
          }
          @if (getAlbumImage(track)) {
            <ion-thumbnail slot="start">
              <img [src]="getAlbumImage(track)" [alt]="track.name">
            </ion-thumbnail>
          }
          <ion-label>
            <h3 class="ut-ellipsis">{{ track.name }}</h3>
            <p class="app-muted-text ut-ellipsis">
              {{ track.artists[0]?.name }} · {{ formatDuration(track.duration_ms) }}
            </p>
          </ion-label>
        </ion-item>
      }
    </ion-list>
  `,
  styleUrls: ['./track-list.component.scss'],
})
export class TrackListComponent {
  tracks = input.required<SpotifyTrack[]>();
  currentTrackUri = input('');
  showIndex = input(true);
  trackClicked = output<SpotifyTrack>();

  getAlbumImage(track: SpotifyTrack): string {
    const images = track.album.images;
    return images.length > 1 ? images[1].url : images.length > 0 ? images[0].url : '';
  }

  formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
