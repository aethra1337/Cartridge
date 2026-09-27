# Cartridge — Organize Your Music

A Spotify playlist curator in the spirit of Organize Your Music:
sync Liked Songs, a single playlist, or **all of your music** (liked +
every owned/followed playlist, de-duplicated), browse automatic
genre/mood/decade bins, filter and plot audio attributes (drag a box on
the plot to stage many at once), stage tracks, and save new playlists
back to Spotify with one click.

## Getting a Spotify API key (2 minutes)

No secret needed — the app uses PKCE, so only a Client ID is required:

1. Log in at https://developer.spotify.com/dashboard and click **Create app**
2. Give it a name (e.g. `Cartridge`) + description, accept the terms
3. Open **Settings → Redirect URIs** and add (local dev runs on
   self-signed HTTPS because Spotify rejects plain `http://localhost`):
   `https://localhost:5173/callback`
4. Press **Save**, then copy the **Client ID** from the app page
5. Paste it into `.env` as `VITE_SPOTIFY_CLIENT_ID` (see `.env.example`)

First run: open `https://localhost:5173` and click through the one-time
self-signed certificate warning (Advanced → Continue). Always use the
`localhost` address — `127.0.0.1` is a different origin and breaks login.

Note: Spotify closed the `/audio-features` endpoint for newer apps, so real
audio data is unavailable regardless of settings — the app fills it
deterministically from genre profiles instead.

## Setup

1. Create an app at https://developer.spotify.com/dashboard
2. Add BOTH redirect URIs (localhost and 127.0.0.1 are different origins —
   registering only one forces a double login, because the PKCE verifier in
   localStorage can't cross origins):
   `http://127.0.0.1:5173/callback` and `http://localhost:5173/callback`
3. Copy env and fill in your client ID:

```sh
cp .env.example .env
```

4. Install and run:

```sh
npm install
npm run dev
```

## Scripts

* `npm run dev` — local dev server
* `npm run build` — typecheck + production build
* `npm run lint` — oxlint
* `npm test` — vitest unit tests (`vitest run`)
* `npm run test:e2e` — Playwright specs in `e2e/` (demo mode, no login)

## Routes

* `/` — landing page (hero, usage guide, FAQ)
* `/app` — the studio (bins, table, plots, stats, staging, compare, duplicates)
* `/app?demo=1` — the studio with a bundled fictional demo collection (no login)
* `/callback` — Spotify auth return (replace with your own domain in prod)
* any other path renders the 404 page

## Studio extras

* **What's new** — after a sync, the sync strip shows a button with the last
  sync date. It opens a modal listing Liked Songs added since that sync
  (newest-first scan, up to 50 tracks) with a one-click "Sync now" action.
* **PWA** — the app ships with `public/manifest.webmanifest` and a minimal
  service worker (`public/sw.js`, registered from `src/main.tsx` in
  production builds). Static shell works offline; Spotify data always
  comes fresh from the network.

## Deploy notes

### Cloudflare Pages (free)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
   select the repo.
3. Build settings: **Framework preset** `Vite` (build `npm run build`,
   output `dist`). SPA fallback needs no extra config — `public/_redirects`
   (`/* → /index.html`) and `public/_headers` are picked up automatically.
4. **Environment variables** (production): set both, then **Retry deployment**
   (env vars bake in at build time):
   - `VITE_SPOTIFY_CLIENT_ID` = your Client ID
   - `VITE_SPOTIFY_REDIRECT_URI` = `https://<your-pages-url>/callback`
5. Spotify dashboard → add `https://<your-pages-url>/callback` to Redirect URIs.

HTTPS comes free with Pages, so login works with no localhost tricks.

### Other hosts

The app uses browser routing, so static hosts need an SPA fallback to
`index.html`. Both are included: `public/_redirects` (Netlify, Cloudflare
Pages) and `vercel.json` (Vercel). For production, register your domain +
`https://yourdomain/callback` in the Spotify dashboard and set
`VITE_SPOTIFY_REDIRECT_URI` accordingly.

## How it works

No backend. Spotify PKCE auth is fully client-side; tokens live in
`localStorage`. Tracks are cached in IndexedDB (Dexie). Because Spotify
restricts `/audio-features` for newer apps, missing audio attributes are
backfilled deterministically by the Audio Intelligence engine
(`src/lib/oym/audioIntelligence.ts`).

## Layout

* `src/App.tsx` — shell, sync, bins sidebar, table, staging, wizard
* `src/components/PlotView.tsx` — lazy-loaded X/Y/Size scatter plot (click or drag-a-box to stage)
* `src/components/StatsView/` — lazy-loaded library charts (artists, genres, decades)
* `src/components/DuplicatesView/` — duplicate-release hunter (stage extras, keep first)
* `src/components/CompareView/` — two-bin comparison
* `src/components/WhatsNew/` — new-tracks-since-last-sync modal
* `src/lib/spotify/` — PKCE auth + API client
* `src/lib/cache/` — Dexie database + sync/hydration
* `src/lib/oym/` — bins, presets, audio estimates, duplicate detection
* `src/lib/demo/` — bundled fictional collection for `/app?demo=1`
* `src/lib/dj/` — DJ flow scoring + ordering
* `*.test.ts` next to sources — vitest unit tests (run with `npm test`)

See `BRANDKIT.md` for colors, logo and copy rules.
