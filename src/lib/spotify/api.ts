import { getValidAccessToken, purgeTokens } from './auth'

export class SpotifyApiError extends Error {
  readonly status: number
  readonly details: string
  constructor(status: number, details = '') {
    super(`Spotify API error (${status})${details ? `: ${details}` : '.'}`)
    this.status = status
    this.details = details
  }
}

export interface SpotifyArtist {
  name: string
}

export interface SpotifyImage {
  url: string
}

export interface SpotifyTrack {
  id: string
  uri: string
  name: string
  artists: (SpotifyArtist & { id: string })[]
  album: {
    name: string
    images: SpotifyImage[]
    release_date?: string
  }
  preview_url: string | null
  popularity: number
  explicit: boolean
  duration_ms: number
}

export interface SavedTrack {
  added_at: string
  track: SpotifyTrack | null
}

export interface AudioFeatureResponse {
  id: string
  danceability: number
  energy: number
  valence: number
  tempo: number
  acousticness: number
  instrumentalness: number
  liveness: number
  loudness: number
  speechiness: number
  key: number
  mode: number
  time_signature: number
  duration_ms: number
}

export interface SpotifyArtistProfile {
  id: string
  name: string
  genres: string[]
}

export interface Playlist {
  id: string
  external_urls: {
    spotify: string
  }
}

async function request<T>(path: string, init?: RequestInit, attempt = 0): Promise<T> {
  const token = await getValidAccessToken()
  if (!token) throw new Error('Connect Spotify to continue.')

  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (response.status === 429 && attempt < 3) {
    const delay = Number(response.headers.get('Retry-After') || 1) * 1000
    await new Promise((resolve) => window.setTimeout(resolve, delay))
    return request<T>(path, init, attempt + 1)
  }

  if (!response.ok) {
    // Token revoked or expired server-side: drop the dead session so the UI
    // falls back to "connect" instead of hammering Spotify with a bad token.
    if (response.status === 401) {
      purgeTokens()
      throw new SpotifyApiError(401, 'Spotify session expired. Please reconnect.')
    }
    const body = await response.text()
    let details = ''
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string }
      details = typeof parsed.error === 'string' ? parsed.error : parsed.error?.message || parsed.message || ''
    } catch {
      details = body
    }
    throw new SpotifyApiError(response.status, details || body)
  }

  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}

export const getCurrentUser = () =>
  request<{ id: string; display_name: string | null; product?: string }>('/me')

export const getSavedTracksCount = async (): Promise<number> => {
  const result = await request<{ total: number }>('/me/tracks?limit=1')
  return result.total
}

export interface NewTrackInfo {
  id: string
  name: string
  artist: string
  album: string
  albumImageUrl: string | null
  addedAt: string
}

/**
 * Newest-first scan of Liked Songs until items older than `sinceIso`.
 * Returns up to `maxItems` tracks plus a hasMore flag (bounded scan).
 */
export async function getTracksAddedSince(
  sinceIso: string,
  maxItems = 50
): Promise<{ tracks: NewTrackInfo[]; hasMore: boolean }> {
  const since = new Date(sinceIso).getTime()
  const tracks: NewTrackInfo[] = []
  let offset = 0
  let hasMore = false
  for (let page = 0; page < 5; page++) {
    const chunk = await getSavedTracks(offset, 50)
    if (!chunk?.items?.length) break
    let stop = false
    for (const item of chunk.items) {
      if (!item?.track?.id) continue
      if (new Date(item.added_at).getTime() > since) {
        if (tracks.length < maxItems) {
          tracks.push({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists.map((a) => a.name).join(', '),
            album: item.track.album.name,
            albumImageUrl: item.track.album.images[0]?.url || null,
            addedAt: item.added_at,
          })
        }
      } else {
        stop = true
        break
      }
    }
    offset += chunk.items.length
    if (stop || chunk.items.length < 50) break
    if (page === 4) hasMore = true
  }
  return { tracks, hasMore }
}

/** Start full-track playback of URIs on a Web Playback SDK device. */
export async function playUrisOnDevice(deviceId: string, uris: string[]): Promise<void> {
  await request(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({ uris }),
  })
}

/** Pause device playback (best-effort companion to preview toggling). */
export async function pauseDevicePlayback(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''
  await request(`/me/player/pause${query}`, { method: 'PUT' })
}

export const getSavedTracks = (offset: number, limit = 50) =>
  request<{ items: SavedTrack[]; total: number }>(`/me/tracks?offset=${offset}&limit=${limit}`)

export interface SpotifyPlaylistItem {
  id: string
  name: string
  tracks: { total: number }
  images: SpotifyImage[]
  owner: { display_name: string | null; id: string }
  public: boolean | null
  collaborative: boolean
  uri: string
}

export interface PlaylistTrackItem {
  added_at: string
  track: SpotifyTrack | null
}

export const getUserPlaylists = (offset = 0, limit = 50) =>
  request<{ items: SpotifyPlaylistItem[]; total: number; next: string | null }>(
    `/me/playlists?offset=${offset}&limit=${limit}`
  )

export async function getAllUserPlaylists(): Promise<SpotifyPlaylistItem[]> {
  const all: SpotifyPlaylistItem[] = []
  let offset = 0
  for (;;) {
    const page = await getUserPlaylists(offset, 50)
    if (!page?.items?.length) break
    all.push(...page.items)
    offset += page.items.length
    if (offset >= page.total || !page.next) break
  }
  return all
}

export const getPlaylistTracks = (playlistId: string, offset: number, limit = 50) =>
  request<{ items: PlaylistTrackItem[]; total: number }>(
    `/playlists/${encodeURIComponent(playlistId)}/tracks?offset=${offset}&limit=${limit}&additional_types=track`
  )

export const getPlaylistMeta = (playlistId: string) =>
  request<{ id: string; name: string; tracks: { total: number }; images: SpotifyImage[] }>(
    `/playlists/${encodeURIComponent(playlistId)}?fields=id,name,tracks.total,images`
  )

/** Accepts raw ID, spotify:playlist:xxx, or https://open.spotify.com/playlist/xxx */
export function parsePlaylistId(input: string): string | null {
  const clean = input.trim()
  if (!clean) return null
  const uriMatch = clean.match(/spotify:playlist:([A-Za-z0-9]+)/)
  if (uriMatch) return uriMatch[1]
  const urlMatch = clean.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]+)/)
  if (urlMatch) return urlMatch[1]
  if (/^[A-Za-z0-9]{10,}$/.test(clean)) return clean
  return null
}

export async function getArtists(artistIds: string[]) {
  const artists: SpotifyArtistProfile[] = []
  const uniqueIds = [...new Set(artistIds.filter(Boolean))]

  for (let index = 0; index < uniqueIds.length; index += 50) {
    const chunk = uniqueIds.slice(index, index + 50)
    try {
      const result = await request<{ artists: (SpotifyArtistProfile | null)[] }>(`/artists?ids=${chunk.join(',')}`)
      if (result.artists) {
        artists.push(...result.artists.filter((a): a is SpotifyArtistProfile => a !== null))
      }
    } catch {
      // Continue even if batch fails
    }
  }
  return artists
}

export async function getAudioFeatures(trackIds: string[]) {
  const features: AudioFeatureResponse[] = []
  const uniqueIds = [...new Set(trackIds.filter(Boolean))]

  for (let index = 0; index < uniqueIds.length; index += 100) {
    const chunk = uniqueIds.slice(index, index + 100)
    try {
      const result = await request<{ audio_features: (AudioFeatureResponse | null)[] }>(
        `/audio-features?ids=${chunk.join(',')}`
      )
      if (result.audio_features) {
        features.push(...result.audio_features.filter((f): f is AudioFeatureResponse => f !== null))
      }
    } catch {
      // Handled by Audio Intelligence fallback
    }
  }
  return features
}

export async function createPlaylist(
  userId: string,
  name: string,
  trackUrisOrIds: string[],
  description = 'Created with Cartridge — Organize Your Music'
): Promise<Playlist> {
  const token = await getValidAccessToken()
  if (!token) throw new Error('Connect Spotify to continue.')

  // 1. Create playlist using /me/playlists or /users/{userId}/playlists.
  // Privacy-first: new playlists are private unless Spotify rejects it,
  // in which case we fall back to a public playlist rather than failing.
  let playlist: Playlist
  try {
    playlist = await request<Playlist>('/me/playlists', {
      method: 'POST',
      body: JSON.stringify({
        name,
        public: false,
        description,
      }),
    })
  } catch {
    // Try user endpoint or public: true (last resort)
    try {
      playlist = await request<Playlist>(`/users/${encodeURIComponent(userId)}/playlists`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          public: false,
          description,
        }),
      })
    } catch {
      // Last resort: public playlist
      playlist = await request<Playlist>('/me/playlists', {
        method: 'POST',
        body: JSON.stringify({
          name,
          public: true,
          description,
        }),
      })
    }
  }

  if (!playlist || !playlist.id) {
    throw new Error('Could not create playlist on Spotify.')
  }

  // 2. Format canonical track URIs and filter out non-track IDs
  const canonicalUris = trackUrisOrIds
    .map((item) => {
      if (!item) return null
      const clean = item.trim()
      if (clean.startsWith('spotify:track:')) return clean
      // Clean ID format
      const idOnly = clean.replace(/[^a-zA-Z0-9]/g, '')
      return idOnly ? `spotify:track:${idOnly}` : null
    })
    .filter((uri): uri is string => Boolean(uri))

  if (!canonicalUris.length) {
    return playlist
  }

  // 3. Add tracks in batches of 100 with multiple endpoint fallbacks
  for (let index = 0; index < canonicalUris.length; index += 100) {
    const chunk = canonicalUris.slice(index, index + 100)
    let added = false
    let lastErrorDetails = ''

    // Attempt 1: Standard POST /playlists/{id}/tracks with JSON body
    try {
      await request(`/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
          uris: chunk,
        }),
      })
      added = true
    } catch (e) {
      lastErrorDetails = e instanceof Error ? e.message : String(e)
    }

    // Attempt 2: Query param /playlists/{id}/tracks?uris=...
    if (!added) {
      try {
        const queryParams = encodeURIComponent(chunk.join(','))
        await request(`/playlists/${playlist.id}/tracks?uris=${queryParams}`, {
          method: 'POST',
        })
        added = true
      } catch (e) {
        lastErrorDetails = e instanceof Error ? e.message : String(e)
      }
    }

    // Attempt 3: /playlists/{id}/items
    if (!added) {
      try {
        await request(`/playlists/${playlist.id}/items`, {
          method: 'POST',
          body: JSON.stringify({
            uris: chunk,
          }),
        })
        added = true
      } catch (e) {
        lastErrorDetails = e instanceof Error ? e.message : String(e)
      }
    }

    if (!added) {
      throw new Error(`Playlist created, but Spotify rejected adding tracks: ${lastErrorDetails}`)
    }
  }

  return playlist
}