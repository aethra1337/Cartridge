import { database } from './database'
import type { Track } from '../types'

export interface LibraryBackup {
  version: 1
  app: 'cartridge'
  exportedAt: string
  trackCount: number
  tracks: Track[]
}

function isTrack(value: unknown): value is Track {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.uri === 'string' && typeof v.name === 'string'
}

/** Serialize the whole on-device library (tracks only, no tokens). */
export async function exportBackup(): Promise<string> {
  const tracks = await database.tracks.toArray()
  const payload: LibraryBackup = {
    version: 1,
    app: 'cartridge',
    exportedAt: new Date().toISOString(),
    trackCount: tracks.length,
    tracks,
  }
  return JSON.stringify(payload)
}

/** Parse + validate a backup file. Throws on corrupt/foreign payloads. */
export function parseBackup(raw: string): Track[] {
  const parsed = JSON.parse(raw) as Partial<LibraryBackup>
  if (!parsed || parsed.app !== 'cartridge' || parsed.version !== 1 || !Array.isArray(parsed.tracks)) {
    throw new Error('Not a Cartridge backup file.')
  }
  const tracks = parsed.tracks.filter(isTrack)
  if (!tracks.length) throw new Error('Backup contains no tracks.')
  return tracks
}

/** Restore a backup into IndexedDB (crash-safe: write first, drop stale after). */
export async function importBackup(raw: string): Promise<number> {
  const tracks = parseBackup(raw)
  await database.tracks.bulkPut(tracks)
  const fresh = new Set(tracks.map((t) => t.id))
  const keys = (await database.tracks.toCollection().primaryKeys()) as string[]
  const stale = keys.filter((id) => !fresh.has(id))
  if (stale.length) await database.tracks.bulkDelete(stale)
  return tracks.length
}
