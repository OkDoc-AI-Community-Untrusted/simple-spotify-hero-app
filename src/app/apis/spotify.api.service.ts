import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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

  /**
   * Spotify control and library endpoints return 204 No Content or 200 with non-JSON body.
   * Angular's HttpClient defaults to JSON parsing, which fails for these responses.
   * This helper uses responseType 'text' to handle them correctly.
   */
  private voidRequest(method: string, url: string, params?: HttpParams, body?: unknown): Observable<void> {
    return this.http.request(method, url, {
      body: body ?? null,
      params,
      responseType: 'text',
    }).pipe(map((): void => undefined));
  }

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

  getPlaylistItems(playlistId: string, limit: number = 100, offset: number = 0): Observable<SpotifyPaginated<SpotifyPlaylistTrack>> {
    const params: HttpParams = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    return this.http.get<SpotifyPaginated<SpotifyPlaylistTrack>>(
      `${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(playlistId)}/items`,
      { params }
    );
  }

  getTrack(trackId: string): Observable<SpotifyTrack> {
    return this.http.get<SpotifyTrack>(`${SPOTIFY_API_BASE}/tracks/${encodeURIComponent(trackId)}`);
  }

  // --- Player control endpoints (all return 204 No Content) ---

  play(deviceId: string, body: Record<string, unknown> = {}): Observable<void> {
    const params: HttpParams = new HttpParams().set('device_id', deviceId);
    return this.voidRequest('PUT', `${SPOTIFY_API_BASE}/me/player/play`, params, body);
  }

  pause(deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams().set('device_id', deviceId);
    return this.voidRequest('PUT', `${SPOTIFY_API_BASE}/me/player/pause`, params);
  }

  next(deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams().set('device_id', deviceId);
    return this.voidRequest('POST', `${SPOTIFY_API_BASE}/me/player/next`, params);
  }

  previous(deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams().set('device_id', deviceId);
    return this.voidRequest('POST', `${SPOTIFY_API_BASE}/me/player/previous`, params);
  }

  seek(positionMs: number, deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams()
      .set('position_ms', positionMs.toString())
      .set('device_id', deviceId);
    return this.voidRequest('PUT', `${SPOTIFY_API_BASE}/me/player/seek`, params);
  }

  setVolume(volumePercent: number, deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams()
      .set('volume_percent', Math.round(volumePercent).toString())
      .set('device_id', deviceId);
    return this.voidRequest('PUT', `${SPOTIFY_API_BASE}/me/player/volume`, params);
  }

  setShuffle(state: boolean, deviceId: string): Observable<void> {
    const params: HttpParams = new HttpParams()
      .set('state', state.toString())
      .set('device_id', deviceId);
    return this.voidRequest('PUT', `${SPOTIFY_API_BASE}/me/player/shuffle`, params);
  }

  transferPlayback(deviceId: string, play: boolean = true): Observable<void> {
    return this.voidRequest('PUT', `${SPOTIFY_API_BASE}/me/player`, undefined, {
      device_ids: [deviceId],
      play,
    });
  }

  // --- Library endpoints (new, replaces deprecated /me/tracks) ---

  saveToLibrary(trackIds: string[]): Observable<void> {
    const uris: string = trackIds.map((id: string) => `spotify:track:${id}`).join(',');
    const params: HttpParams = new HttpParams().set('uris', uris);
    return this.voidRequest('PUT', `${SPOTIFY_API_BASE}/me/library`, params);
  }

  removeFromLibrary(trackIds: string[]): Observable<void> {
    const uris: string = trackIds.map((id: string) => `spotify:track:${id}`).join(',');
    const params: HttpParams = new HttpParams().set('uris', uris);
    return this.voidRequest('DELETE', `${SPOTIFY_API_BASE}/me/library`, params);
  }

  checkLibraryContains(trackIds: string[]): Observable<boolean[]> {
    const uris: string = trackIds.map((id: string) => `spotify:track:${id}`).join(',');
    const params: HttpParams = new HttpParams().set('uris', uris);
    return this.http.get<boolean[]>(`${SPOTIFY_API_BASE}/me/library/contains`, { params });
  }
}
