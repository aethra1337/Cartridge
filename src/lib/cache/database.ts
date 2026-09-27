import Dexie, { type Table } from 'dexie'
import type { Track } from '../types'
import type { SavedTrack } from '../spotify/api'

/** One fetched page of raw Spotify items, kept so an interrupted sync can resume. */
export interface SyncPageRow {
  id?: number
  /** `liked` or `playlist:<id>` */
  session: string
  page: number
  total: number
  items: SavedTrack[]
  updatedAt: number
}

export interface SyncSessionRow {
  session: string
  kind: 'liked' | 'playlist' | 'all'
  playlistId: string | null
  playlistName: string | null
  total: number
  /** Highest page index stored (0-based count). */
  pages: number
  updatedAt: number
}

export interface SyncHistoryRecord {
  id?: number
  at: number
  kind: 'liked' | 'playlist' | 'all'
  label: string
  trackCount: number
  durationMs: number
}

class MusicDatabase extends Dexie {
  tracks!: Table<Track, string>
  syncPages!: Table<SyncPageRow, number>
  syncSessions!: Table<SyncSessionRow, string>
  history!: Table<SyncHistoryRecord, number>
  constructor() {
    super('music-organizer')
    this.version(1).stores({ tracks: 'id, addedAt, artist, name' })
    // v2 adds sync checkpoint + history tables; existing tracks are preserved.
    this.version(2).stores({
      tracks: 'id, addedAt, artist, name',
      syncPages: '++id, session',
      syncSessions: 'session',
      history: '++id, at',
    })
  }
}
export const database = new MusicDatabase()
