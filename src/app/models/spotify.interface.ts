export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  is_playable?: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  uri: string;
  owner: {
    id: string;
    display_name: string;
  };
  items?: {
    total: number;
    href: string;
  };
}

export interface SpotifyPlaylistTrack {
  item: SpotifyTrack;
  added_at: string;
}

export interface SpotifyShow {
  id: string;
  name: string;
  description: string;
  publisher: string;
  images: SpotifyImage[];
  uri: string;
  total_episodes: number;
  media_type: string;
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  description: string;
  images: SpotifyImage[];
  release_date: string;
  is_playable: boolean;
  show?: SpotifyShow;
}

export interface SpotifyPaginated<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface SpotifySearchResult {
  tracks?: SpotifyPaginated<SpotifyTrack>;
  playlists?: SpotifyPaginated<SpotifyPlaylist>;
  shows?: SpotifyPaginated<SpotifyShow>;
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export interface SpotifyPlayerState {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  shuffle: boolean;
  isFavorited: boolean;
}

export interface SpotifyDeviceState {
  device_id: string;
  is_active: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}
