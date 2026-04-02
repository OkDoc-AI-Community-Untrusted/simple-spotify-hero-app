import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { SpotifyPlayerService } from '../../services/spotify-player.service';
import { SpotifyTrack } from '../../models/spotify.interface';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [IonicModule, CommonModule],
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

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
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
