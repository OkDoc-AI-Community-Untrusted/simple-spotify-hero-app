import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SPOTIFY_API_BASE, SEARCH_RESULT_LIMIT, PLAYLIST_FETCH_LIMIT } from '../models/constants';
import {
  SpotifySearchResult,
  SpotifyPaginated,
  SpotifyPlaylist,
  SpotifyPlaylistTrack,
  SpotifyTrack,
} from '../models/spotify.interface';

@Injectable({ providedIn: 'root' })
export class SpotifyApiService {
  constructor(private http: HttpClient) {}

  search(query: string, type: string, limit: number = SEARCH_RESULT_LIMIT): Observable<SpotifySearchResult> {
    const params: HttpParams = new HttpParams()
      .set('q', query)
      .set('type', type)
      .set('limit', limit.toString());
    return this.http.get<SpotifySearchResult>(`${SPOTIFY_API_BASE}/search`, { params });
  }

  getMyPlaylists(limit: number = PLAYLIST_FETCH_LIMIT, offset: number = 0): Observable<SpotifyPaginated<SpotifyPlaylist>> {
    const params: HttpParams = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    return this.http.get<SpotifyPaginated<SpotifyPlaylist>>(`${SPOTIFY_API_BASE}/me/playlists`, { params });
  }

  getPlaylistTracks(playlistId: string, limit: number = 100, offset: number = 0): Observable<SpotifyPaginated<SpotifyPlaylistTrack>> {
    const params: HttpParams = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    return this.http.get<SpotifyPaginated<SpotifyPlaylistTrack>>(
      `${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks`,
      { params }
    );
  }

  getTrack(trackId: string): Observable<SpotifyTrack> {
    return this.http.get<SpotifyTrack>(`${SPOTIFY_API_BASE}/tracks/${encodeURIComponent(trackId)}`);
  }

  play(deviceId: string, body: Record<string, unknown> = {}): Observable<void> {
    const params: HttpParams = new HttpParams().set('device_id', deviceId);
    return this.http.put<void>(`${SPOTIFY_API_BASE}/me/player/play`, body, { params });
  }

  pause(deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams().set('device_id', deviceId);
    return this.http.put<void>(`${SPOTIFY_API_BASE}/me/player/pause`, {}, { params });
  }

  next(deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams().set('device_id', deviceId);
    return this.http.post<void>(`${SPOTIFY_API_BASE}/me/player/next`, {}, { params });
  }

  previous(deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams().set('device_id', deviceId);
    return this.http.post<void>(`${SPOTIFY_API_BASE}/me/player/previous`, {}, { params });
  }

  seek(positionMs: number, deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams()
      .set('position_ms', positionMs.toString())
      .set('device_id', deviceId);
    return this.http.put<void>(`${SPOTIFY_API_BASE}/me/player/seek`, {}, { params });
  }

  setVolume(volumePercent: number, deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams()
      .set('volume_percent', Math.round(volumePercent).toString())
      .set('device_id', deviceId);
    return this.http.put<void>(`${SPOTIFY_API_BASE}/me/player/volume`, {}, { params });
  }

  setShuffle(state: boolean, deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams()
      .set('state', state.toString())
      .set('device_id', deviceId);
    return this.http.put<void>(`${SPOTIFY_API_BASE}/me/player/shuffle`, {}, { params });
  }

  saveTracks(ids: string[]): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_BASE}/me/tracks`, { ids });
  }

  removeTracks(ids: string[]): Observable<void> {
    return this.http.delete<void>(`${SPOTIFY_API_BASE}/me/tracks`, { body: { ids } });
  }

  checkSavedTracks(ids: string[]): Observable<boolean[]> {
    const params: HttpParams = new HttpParams().set('ids', ids.join(','));
    return this.http.get<boolean[]>(`${SPOTIFY_API_BASE}/me/tracks/contains`, { params });
  }

  transferPlayback(deviceId: string, play: boolean = true): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_BASE}/me/player`, {
      device_ids: [deviceId],
      play,
    });
  }
}
