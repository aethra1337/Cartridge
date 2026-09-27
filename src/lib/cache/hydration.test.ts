import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TOTAL = 120

function fakeRawTrack(i: number) {
  return {
    added_at: new Date(Date.now() - i * 3600000).toISOString(),
    track: {
      id: `track-${i}`,
      uri: `spotify:track:track-${i}`,
      name: `Song ${i}`,
      artists: [{ id: `artist-${i % 10}`, name: `Artist ${i % 10}` }],
      album: { name: `Album ${i % 5}`, images: [], release_date: '2021-03-04' },
      preview_url: null,
      popularity: 50,
      explicit: false,
      duration_ms: 200000,
    },
  }
}

const ALL = Array.from({ length: TOTAL }, (_, i) => fakeRawTrack(i))

const apiMocks = vi.hoisted(() => ({
  offsets: [] as number[],
  failAtOffset: -1,
}))

vi.mock('../spotify/api', () => ({
  SpotifyApiError: class SpotifyApiError extends Error {
    status: number
    details: string
    constructor(status: number, details = '') {
      super(`Spotify API error (${status})`)
      this.status = status
      this.details = details
    }
  },
  getSavedTracks: vi.fn(async (offset: number) => {
    apiMocks.offsets.push(offset)
    if (offset === apiMocks.failAtOffset) throw new Error('network boom')
    return { items: ALL.slice(offset, offset + 50), total: TOTAL }
  }),
  getArtists: vi.fn(async () => []),
  getAudioFeatures: vi.fn(async () => []),
  getPlaylistMeta: vi.fn(),
  getPlaylistTracks: vi.fn(async (_playlistId: string, offset: number) => {
    // One playlist: first 10 overlap with Liked Songs, 20 are exclusive.
    const exclusive = Array.from({ length: 20 }, (_, i) => {
      const raw = fakeRawTrack(1000 + i)
      return { ...raw, track: { ...raw.track!, id: `plist-${i}` } }
    })
    const items = [...ALL.slice(0, 10), ...exclusive]
    return { items: items.slice(offset, offset + 50), total: items.length }
  }),
  getAllUserPlaylists: vi.fn(async () => [{ id: 'plist-1', name: 'Gym', tracks: { total: 30 } }]),
}))

import { database } from './database'
import {
  checkpointSessionKey,
  clearSyncSession,
  getLastSync,
  isCheckpointFresh,
  peekSyncSession,
  recordSyncHistory,
  syncAllTracks,
  syncSavedTracks,
} from './hydration'

beforeEach(async () => {
  apiMocks.offsets = []
  apiMocks.failAtOffset = -1
  await database.tracks.clear()
  await database.syncPages.clear()
  await database.syncSessions.clear()
  await database.history.clear()
})

describe('resumable sync', () => {
  it('syncs the full library, records history and clears the session', async () => {
    const tracks = await syncSavedTracks()
    expect(tracks).toHaveLength(TOTAL)
    expect(tracks.every((t) => Boolean(t.audioFeatures))).toBe(true)
    expect(await database.tracks.count()).toBe(TOTAL)
    expect(await peekSyncSession('liked', null)).toBeNull()
    const last = await getLastSync()
    expect(last?.trackCount).toBe(TOTAL)
    expect(last?.label).toBe('Your Saved Tracks')
  })

  it('resumes an interrupted sync without refetching stored pages', async () => {
    apiMocks.failAtOffset = 50
    await expect(syncSavedTracks()).rejects.toThrow('network boom')
    const peek = await peekSyncSession('liked', null)
    expect(peek?.saved).toBe(50)

    // second run: failure gone, must continue from offset 50
    apiMocks.failAtOffset = -1
    apiMocks.offsets = []
    const tracks = await syncSavedTracks()
    expect(tracks).toHaveLength(TOTAL)
    expect(apiMocks.offsets).toEqual([50, 100])
    expect(await database.tracks.count()).toBe(TOTAL)
    expect(await peekSyncSession('liked', null)).toBeNull()
  })

  it('discards stale sessions', async () => {
    const session = checkpointSessionKey('liked', null)
    await database.syncSessions.put({
      session, kind: 'liked', playlistId: null, playlistName: null,
      total: TOTAL, pages: 1, updatedAt: Date.now() - 8 * 24 * 3600000,
    })
    expect(await peekSyncSession('liked', null)).toBeNull()
    expect(await database.syncSessions.get(session)).toBeUndefined()
    expect(isCheckpointFresh(Date.now())).toBe(true)
    expect(isCheckpointFresh(Date.now() - 8 * 24 * 3600000)).toBe(false)
  })

  it('caps history and returns the latest sync', async () => {
    for (let i = 0; i < 25; i++) {
      await recordSyncHistory({ at: i, kind: 'liked', label: `sync-${i}`, trackCount: i, durationMs: 1 })
    }
    expect(await database.history.count()).toBe(20)
    expect(await getLastSync().then((r) => r?.label)).toBe('sync-24')
  })

  it('clears a session explicitly', async () => {
    apiMocks.failAtOffset = 50
    await expect(syncSavedTracks()).rejects.toThrow()
    await clearSyncSession(checkpointSessionKey('liked', null))
    expect(await peekSyncSession('liked', null)).toBeNull()
  })
})

describe('syncAllTracks', () => {
  it('merges liked + playlists, dedupes overlap, records kind all', async () => {
    const result = await syncAllTracks()
    // 120 liked + 20 exclusive playlist tracks (10 overlap removed)
    expect(result.tracks).toHaveLength(TOTAL + 20)
    expect(result.playlistCount).toBe(1)
    expect(await database.tracks.count()).toBe(TOTAL + 20)
    const last = await getLastSync()
    expect(last?.kind).toBe('all')
    expect(last?.label).toBe('All Music')
    expect(last?.trackCount).toBe(TOTAL + 20)
  })

  it('works with zero playlists (liked only)', async () => {
    const { getAllUserPlaylists } = await import('../spotify/api')
    vi.mocked(getAllUserPlaylists).mockResolvedValueOnce([])
    const result = await syncAllTracks()
    expect(result.tracks).toHaveLength(TOTAL)
    expect(result.playlistCount).toBe(0)
  })
})
