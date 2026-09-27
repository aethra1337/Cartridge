import { database, type SyncHistoryRecord } from './database'
import {
  getAllUserPlaylists,
  getArtists,
  getAudioFeatures,
  getPlaylistMeta,
  getPlaylistTracks,
  getSavedTracks,
  SpotifyApiError,
  type SavedTrack,
} from '../spotify/api'
import { estimateAudioFeatures } from '../oym/audioIntelligence'
import type { Track } from '../types'

export type SyncProgress = {
  percent: number
  tracks: number
  phase?: string
}

type ValidItem = { added_at: string; track: NonNullable<SavedTrack['track']> }

async function enrichRawItems(
  validSaved: ValidItem[],
  onProgress?: (progress: SyncProgress) => void,
  onWarning?: (message: string) => void
): Promise<Track[]> {
  onProgress?.({ percent: 50, tracks: validSaved.length, phase: 'Analyzing artist genres...' })

  const artistIds = [...new Set(validSaved.flatMap(({ track }) => track.artists.map(({ id }) => id).filter(Boolean)))]
  let artistMap = new Map<string, { genres: string[] }>()

  try {
    const artists = await getArtists(artistIds)
    artistMap = new Map(artists.map((artist) => [artist.id, artist]))
  } catch (error) {
    if (!(error instanceof SpotifyApiError) || error.status !== 403) throw error
    onWarning?.('Spotify genres restricted; intelligent audio classifier active.')
  }

  onProgress?.({ percent: 70, tracks: validSaved.length, phase: 'Analyzing audio features & mood profile...' })

  const trackIds = validSaved.map(({ track }) => track.id).filter(Boolean)
  let featureMap = new Map<string, Track['audioFeatures']>()

  try {
    const features = await getAudioFeatures(trackIds)
    featureMap = new Map(
      features.map((feature) => [
        feature.id,
        {
          danceability: feature.danceability,
          energy: feature.energy,
          valence: feature.valence,
          tempo: feature.tempo,
          acousticness: feature.acousticness,
          instrumentalness: feature.instrumentalness,
          liveness: feature.liveness,
          loudness: feature.loudness,
          speechiness: feature.speechiness,
          key: feature.key,
          mode: feature.mode,
          timeSignature: feature.time_signature,
          durationMs: feature.duration_ms,
        },
      ])
    )
  } catch {
    // Spotify restricts /v1/audio-features on newer apps; we will backfill with Audio Intelligence engine below
  }

  onProgress?.({ percent: 90, tracks: validSaved.length, phase: 'Indexing your library with 100% audio coverage...' })

  return validSaved.map(({ added_at: addedAt, track }) => {
    const year = track.album.release_date ? Number.parseInt(track.album.release_date.slice(0, 4), 10) : null
    const artistGenres = [...new Set(track.artists.flatMap(({ id }) => artistMap.get(id)?.genres || []))]

    const audioFeatures =
      featureMap.get(track.id) ||
      estimateAudioFeatures(
        {
          id: track.id,
          name: track.name,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
          release_date: track.album.release_date,
        },
        artistGenres
      )

    return {
      id: track.id,
      uri: `spotify:track:${track.id}`,
      name: track.name,
      artist: track.artists.map(({ name }) => name).join(', '),
      artistGenres,
      album: track.album.name,
      albumImageUrl: track.album.images[0]?.url || null,
      releaseDate: track.album.release_date || null,
      year: Number.isNaN(year) ? null : year,
      decade: year && !Number.isNaN(year) ? `${Math.floor(year / 10) * 10}s` : null,
      previewUrl: track.preview_url,
      addedAt,
      popularity: track.popularity,
      explicit: track.explicit,
      durationMs: track.duration_ms,
      audioFeatures,
    }
  })
}

/** Resumable sync: fetched pages are journaled per session so an interrupted
 * sync (rate-limit, network blip, closed tab) continues where it stopped
 * instead of starting over. Sessions older than 7 days are discarded. */
export const CHECKPOINT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_HISTORY_ROWS = 20

export const checkpointSessionKey = (kind: 'liked' | 'playlist' | 'all', playlistId: string | null): string =>
  kind === 'liked' ? 'liked' : kind === 'all' ? 'all' : `playlist:${playlistId}`

export function isCheckpointFresh(updatedAt: number, now = Date.now()): boolean {
  return now - updatedAt <= CHECKPOINT_TTL_MS
}

async function loadSessionItems(session: string): Promise<{ items: SavedTrack[]; total: number } | null> {
  try {
    const row = await database.syncSessions.get(session)
    if (!row) return null
    if (!isCheckpointFresh(row.updatedAt)) {
      await clearSyncSession(session)
      return null
    }
    const pages = await database.syncPages.where('session').equals(session).sortBy('page')
    return { items: pages.flatMap((p) => p.items), total: row.total }
  } catch {
    return null
  }
}

async function storeSessionPage(
  session: string,
  kind: 'liked' | 'playlist' | 'all',
  playlistId: string | null,
  playlistName: string | null,
  page: number,
  total: number,
  items: ValidItem[]
): Promise<void> {
  try {
    await database.transaction('rw', [database.syncPages, database.syncSessions], async () => {
      await database.syncPages.add({ session, page, total, items, updatedAt: Date.now() })
      const prev = await database.syncSessions.get(session)
      await database.syncSessions.put({
        session,
        kind,
        playlistId,
        playlistName,
        total,
        pages: Math.max(prev?.pages ?? 0, page + 1),
        updatedAt: Date.now(),
      })
    })
  } catch {
    // checkpointing is best-effort; the sync itself continues
  }
}

export async function clearSyncSession(session: string): Promise<void> {
  try {
    await database.transaction('rw', [database.syncPages, database.syncSessions], async () => {
      await database.syncPages.where('session').equals(session).delete()
      await database.syncSessions.delete(session)
    })
  } catch {
    // ignore
  }
}

/** Peek at an interrupted sync (for "resume from track N" messaging). */
export async function peekSyncSession(
  kind: 'liked' | 'playlist' | 'all',
  playlistId: string | null
): Promise<{ saved: number; total: number } | null> {
  const loaded = await loadSessionItems(checkpointSessionKey(kind, playlistId))
  if (!loaded) return null
  const valid = loaded.items.filter((item) => Boolean(item?.track?.id))
  if (!valid.length) return null
  return { saved: valid.length, total: loaded.total }
}

export async function recordSyncHistory(entry: Omit<SyncHistoryRecord, 'id'>): Promise<void> {
  try {
    await database.history.add(entry)
    const count = await database.history.count()
    if (count > MAX_HISTORY_ROWS) {
      const stale = await database.history.orderBy('id').limit(count - MAX_HISTORY_ROWS).primaryKeys()
      await database.history.bulkDelete(stale)
    }
  } catch {
    // ignore
  }
}

export async function getLastSync(): Promise<SyncHistoryRecord | null> {
  try {
    const rows = await database.history.orderBy('at').reverse().limit(1).toArray()
    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function getSyncHistory(): Promise<SyncHistoryRecord[]> {
  try {
    return await database.history.orderBy('at').reverse().limit(MAX_HISTORY_ROWS).toArray()
  } catch {
    return []
  }
}

interface RawPage {
  items: SavedTrack[]
  total: number
}

/**
 * Fetch every page, resuming from a stored session when one exists.
 * Raw pages are journaled as they arrive; only the final enrich+replace
 * touches the track cache, so a failure never leaves a half-written library.
 */
async function fetchAllRawItems(
  kind: 'liked' | 'playlist' | 'all',
  playlistId: string | null,
  playlistName: string | null,
  fetchPage: (offset: number, limit: number) => Promise<RawPage | null>,
  onProgress?: (progress: SyncProgress) => void,
  phasePrefix = 'Fetching tracks'
): Promise<ValidItem[]> {
  const session = checkpointSessionKey(kind, playlistId)
  const resumed = await loadSessionItems(session)
  const saved: SavedTrack[] = resumed?.items ?? []
  let offset = saved.filter((item) => Boolean(item?.track?.id)).length
  let total = resumed?.total ?? 1

  if (resumed && saved.length > 0) {
    onProgress?.({
      percent: 5,
      tracks: saved.length,
      phase: `Resuming interrupted sync from track ${saved.length.toLocaleString()}…`,
    })
  }

  let page = Math.floor(offset / 50)
  for (;;) {
    const chunk = await fetchPage(offset, 50)
    if (!chunk?.items?.length) break
    total = chunk.total
    const valid = chunk.items.filter((item): item is ValidItem => Boolean(item?.track?.id))
    saved.push(...chunk.items)
    offset += chunk.items.length
    const percent = Math.min(45, Math.round((saved.length / Math.max(total, 1)) * 45))
    onProgress?.({
      percent,
      tracks: saved.length,
      phase: `${phasePrefix} (${saved.length}/${total})...`,
    })
    await storeSessionPage(session, kind, playlistId, playlistName, page, total, valid)
    page += 1
    if (chunk.items.length < 50 || offset >= total) break
  }

  // Dedupe by id: a library that changed mid-sync can replay an overlapping
  // page, and the track cache is id-keyed anyway.
  const seen = new Set<string>()
  return saved.filter((item): item is ValidItem => {
    const id = item?.track?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** Crash-safe cache replace: write first, then drop stale ids. Never clear-then-write. */
async function replaceAllTracks(tracks: Track[]): Promise<void> {  await database.tracks.bulkPut(tracks)
  const fresh = new Set(tracks.map((t) => t.id))
  const keys = (await database.tracks.toCollection().primaryKeys()) as string[]
  const stale = keys.filter((id) => !fresh.has(id))
  if (stale.length > 0) {
    await database.tracks.bulkDelete(stale)
  }
}

export async function syncSavedTracks(
  onProgress?: (progress: SyncProgress) => void,
  onWarning?: (message: string) => void
): Promise<Track[]> {
  const startedAt = Date.now()
  const session = checkpointSessionKey('liked', null)

  onProgress?.({ percent: 5, tracks: 0, phase: 'Connecting to your Spotify library...' })

  const validSaved = await fetchAllRawItems(
    'liked',
    null,
    null,
    (offset, limit) => getSavedTracks(offset, limit),
    onProgress,
    'Fetching tracks'
  )

  const tracks = await enrichRawItems(validSaved, onProgress, onWarning)

  await replaceAllTracks(tracks)
  await clearSyncSession(session)
  await recordSyncHistory({
    at: Date.now(),
    kind: 'liked',
    label: 'Your Saved Tracks',
    trackCount: tracks.length,
    durationMs: Date.now() - startedAt,
  })

  onProgress?.({ percent: 100, tracks: tracks.length, phase: 'Ready!' })
  return tracks
}

export async function syncPlaylistTracks(
  playlistId: string,
  onProgress?: (progress: SyncProgress) => void,
  onWarning?: (message: string) => void
): Promise<{ tracks: Track[]; playlistName: string; total: number }> {
  const startedAt = Date.now()
  const session = checkpointSessionKey('playlist', playlistId)
  const meta = await getPlaylistMeta(playlistId).catch(() => null)
  const playlistName = meta?.name || 'Selected playlist'
  const metaTotal = meta?.tracks.total ?? 1

  onProgress?.({ percent: 5, tracks: 0, phase: `Connecting to "${playlistName}"...` })

  const validSaved = await fetchAllRawItems(
    'playlist',
    playlistId,
    playlistName,
    (offset, limit) => getPlaylistTracks(playlistId, offset, limit),
    onProgress,
    'Fetching tracks'
  )
  const total = validSaved.length || metaTotal

  const tracks = await enrichRawItems(validSaved, onProgress, onWarning)

  await replaceAllTracks(tracks)
  await clearSyncSession(session)
  await recordSyncHistory({
    at: Date.now(),
    kind: 'playlist',
    label: playlistName,
    trackCount: tracks.length,
    durationMs: Date.now() - startedAt,
  })

  onProgress?.({ percent: 100, tracks: tracks.length, phase: 'Ready!' })
  return { tracks, playlistName, total }
}

/**
 * "All of your music": Liked Songs plus every playlist (owned + followed),
 * merged and de-duplicated by track id. One enrich + one cache replace at
 * the end, so a failure never leaves a half-written library.
 */
export async function syncAllTracks(
  onProgress?: (progress: SyncProgress) => void,
  onWarning?: (message: string) => void
): Promise<{ tracks: Track[]; playlistCount: number }> {
  const startedAt = Date.now()

  onProgress?.({ percent: 2, tracks: 0, phase: 'Listing your playlists...' })
  const lists = await getAllUserPlaylists().catch(() => [])

  const validLiked = await fetchAllRawItems(
    'liked',
    null,
    null,
    (offset, limit) => getSavedTracks(offset, limit),
    onProgress,
    'Fetching Liked Songs'
  )

  const seen = new Set(validLiked.map((item) => item.track.id))
  const combined: ValidItem[] = [...validLiked]
  let done = 0
  for (const list of lists) {
    const items = await fetchAllRawItems(
      'playlist',
      list.id,
      list.name,
      (offset, limit) => getPlaylistTracks(list.id, offset, limit),
      undefined,
      `Fetching "${list.name}"`
    )
    for (const item of items) {
      if (!seen.has(item.track.id)) {
        seen.add(item.track.id)
        combined.push(item)
      }
    }
    done += 1
    onProgress?.({
      percent: Math.min(45, Math.round((done / Math.max(lists.length, 1)) * 45)),
      tracks: combined.length,
      phase: `Fetching playlists (${done}/${lists.length})...`,
    })
  }

  const tracks = await enrichRawItems(combined, onProgress, onWarning)

  await replaceAllTracks(tracks)
  await clearSyncSession(checkpointSessionKey('liked', null))
  for (const list of lists) {
    await clearSyncSession(checkpointSessionKey('playlist', list.id))
  }
  await recordSyncHistory({
    at: Date.now(),
    kind: 'all',
    label: 'All Music',
    trackCount: tracks.length,
    durationMs: Date.now() - startedAt,
  })

  onProgress?.({ percent: 100, tracks: tracks.length, phase: 'Ready!' })
  return { tracks, playlistCount: lists.length }
}