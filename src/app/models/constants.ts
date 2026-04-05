export const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
export const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'user-library-modify',
  'user-follow-read',
  'user-follow-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'user-read-playback-position',
].join(' ');

export const SEARCH_DEBOUNCE_MS = 500;
// NOTE: Maximum allowed is 10
export const SEARCH_RESULT_LIMIT = 5;
export const PLAYLIST_FETCH_LIMIT = 10;
export const POSITION_POLL_INTERVAL_MS = 1000;
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

export const PLAYER_NAME = 'Simple Spotify Hero App';
export const DEFAULT_VOLUME = 0.5;
