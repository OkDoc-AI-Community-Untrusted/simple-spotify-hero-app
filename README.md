# Simple Spotify Hero App

An [OkDoc](https://okdoc.ai) Hero App (iframe plugin) that integrates Spotify playback into OkDoc conversations. Built with **Angular 20**, **Ionic 8**, and the **Spotify Web Playback SDK**.

## Features

- **Spotify Login** — PKCE-based authorization (no backend needed)
- **My Playlists** — Browse and play your Spotify playlists
- **Search** — Find tracks and playlists, play them instantly
- **Full Playback Controls** — Play/pause, next/previous, seek, volume, shuffle, favorite
- **OkDoc Integration** — 14 registered tools for voice-controlled Spotify playback
- **Auto-play** — Continuous playback within playlists

## Spotify Developer Setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in:
   - **App name**: Simple Spotify Hero App
   - **App description**: OkDoc Spotify plugin
   - **Redirect URIs**: Add both:
     - `http://localhost:4200/callback` (for development)
     - `https://YOUR_GITHUB_USERNAME.github.io/simple-spotify-hero-app/callback` (for production)
   - **Which API/SDKs are you planning to use?**: Check **Web Playback SDK** and **Web API**
4. Click **Save**
5. Copy your **Client ID** from the app settings

## Configuration

1. Open `src/environments/environment.ts` and set your Client ID:
   ```typescript
   spotifyClientId: 'YOUR_SPOTIFY_CLIENT_ID'
   ```
2. For production, also update `src/environments/environment.prod.ts` with your Client ID and GitHub Pages redirect URI.

> **Note:** Spotify requires a **Premium** account for Web Playback SDK features.

## Development

```bash
npm install
ng serve
```

Open `http://localhost:4200/` in your browser.

## Building

```bash
ng build
```

Build artifacts go to `dist/`. For GitHub Pages deployment:

```bash
ng build --base-href /simple-spotify-hero-app/
```

## Deployment

This app uses **GitHub Actions** to auto-deploy to GitHub Pages on push to `main`. See [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

To enable:
1. Go to your repo **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Push to `main`

## OkDoc Integration

Load this app as an OkDoc Hero App by pointing to your deployed URL. The app registers these voice-controllable tools:

| Tool | Description |
|------|-------------|
| `search_tracks` | Search for tracks by name |
| `search_playlists` | Search for playlists |
| `play_track` | Play a specific track by URI |
| `play_playlist` | Play a playlist by URI |
| `get_my_playlists` | List user's playlists |
| `play` / `pause` | Resume / pause playback |
| `next_track` / `previous_track` | Skip forward / back |
| `seek` | Seek to position in ms |
| `set_volume` | Set volume (0-100) |
| `toggle_shuffle` | Toggle shuffle mode |
| `toggle_favorite` | Save/remove current track |
| `get_playback_state` | Get current playback info |
