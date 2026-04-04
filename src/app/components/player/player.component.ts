import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonRange } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { SpotifyPlayerService } from '../../services/spotify-player.service';
import { SpotifyTrack } from '../../models/spotify.interface';
import { TrackListComponent } from '../track-list/track-list.component';

@Component({
  selector: 'app-player',
  imports: [IonButton, IonIcon, IonRange, CommonModule, TrackListComponent],
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit, OnDestroy {
  currentTrack: SpotifyTrack | null = null;
  isPlaying = false;
  positionMs = 0;
  durationMs = 0;
  volume = 50;
  shuffle = false;
  isFavorited = false;
  isExpanded = false;
  showQueue = false;
  nowPlayingTracks: SpotifyTrack[] = [];
  currentContextUri = '';

  private subscriptions: Subscription[] = [];

  constructor(private playerService: SpotifyPlayerService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.playerService.currentTrack$.subscribe((track: SpotifyTrack | null) => {
        this.currentTrack = track;
      }),
      this.playerService.isPlaying$.subscribe((playing: boolean) => {
        this.isPlaying = playing;
      }),
      this.playerService.positionMs$.subscribe((pos: number) => {
        this.positionMs = pos;
      }),
      this.playerService.durationMs$.subscribe((dur: number) => {
        this.durationMs = dur;
      }),
      this.playerService.volume$.subscribe((vol: number) => {
        this.volume = vol;
      }),
      this.playerService.shuffle$.subscribe((shuf: boolean) => {
        this.shuffle = shuf;
      }),
      this.playerService.isFavorited$.subscribe((fav: boolean) => {
        this.isFavorited = fav;
      }),
      this.playerService.currentContextUri$.subscribe((uri: string) => {
        this.currentContextUri = uri;
      }),
      this.playerService.nowPlayingList$.subscribe((tracks: SpotifyTrack[]) => {
        this.nowPlayingTracks = tracks;
      }),
      // Expand/collapse player from tool calls
      this.playerService.isPlayerExpanded$.subscribe((expanded: boolean) => {
        this.isExpanded = expanded;
        if (!expanded) {
          this.showQueue = false;
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s: Subscription) => s.unsubscribe());
  }

  get albumImageUrl(): string {
    if (!this.currentTrack) {
      return '';
    }
    const images = this.currentTrack.album.images;
    return images.length > 0 ? images[0].url : '';
  }

  get artistNames(): string {
    if (!this.currentTrack) {
      return '';
    }
    return this.currentTrack.artists.map((a) => a.name).join(', ');
  }

  get positionFormatted(): string {
    return this.formatTime(this.positionMs);
  }

  get durationFormatted(): string {
    return this.formatTime(this.durationMs);
  }

  get progressPercent(): number {
    return this.durationMs > 0 ? (this.positionMs / this.durationMs) * 100 : 0;
  }

  get hasNowPlayingList(): boolean {
    return this.nowPlayingTracks.length > 0;
  }

  get toggleQueueIcon(): string {
    return this.showQueue ? 'musical-notes-outline' : 'list-outline';
  }

  toggleExpand(): void {
    const next = !this.isExpanded;
    this.playerService.isPlayerExpanded$.next(next);
    if (!next) {
      this.showQueue = false;
    }
  }

  expandToQueue(): void {
    this.playerService.isPlayerExpanded$.next(true);
    this.showQueue = true;
  }

  toggleQueue(): void {
    this.showQueue = !this.showQueue;
  }

  onQueueTrackClicked(track: SpotifyTrack): void {
    if (this.currentContextUri) {
      this.playerService.playContextUri(this.currentContextUri, track.uri);
    } else {
      this.playerService.playTrackUri(track.uri);
    }
  }

  togglePlay(): void {
    this.playerService.togglePlay();
  }

  nextTrack(): void {
    this.playerService.nextTrack();
  }

  previousTrack(): void {
    this.playerService.previousTrack();
  }

  onSeekChange(event: CustomEvent): void {
    const posMs: number = event.detail.value as number;
    this.playerService.seek(posMs);
  }

  onVolumeChange(event: CustomEvent): void {
    const vol: number = event.detail.value as number;
    this.playerService.setVolume(vol);
  }

  toggleShuffle(): void {
    this.playerService.toggleShuffle();
  }

  toggleFavorite(): void {
    this.playerService.toggleFavorite();
  }

  private formatTime(ms: number): string {
    const totalSeconds: number = Math.floor(ms / 1000);
    const minutes: number = Math.floor(totalSeconds / 60);
    const seconds: number = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
