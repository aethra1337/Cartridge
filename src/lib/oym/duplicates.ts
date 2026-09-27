import type { Track } from '../types'

export interface DuplicateGroup {
  key: string
  /** Display title taken from the first track in the group. */
  name: string
  /** Display artist taken from the first track in the group. */
  artist: string
  tracks: Track[]
}

/**
 * Normalize a song title so different releases of the same song collide:
 * "Midnight Ferry (Remastered 2011)" ~ "midnight ferry" ~ "Midnight Ferry [Live]".
 */
export function normalizeTitle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+-\s+(remaster.*|live|acoustic|unplugged|demo|edit|.*mix|version|rework|sped up|slowed.*|.*reverb)$/, '')
    .replace(/\s+feat\.?\s+.*$/, '')
    .replace(/\s+ft\.?\s+.*$/, '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalize the artist field (separators/case/whitespace only — order kept). */
export function normalizeArtist(artist: string): string {
  return artist
    .toLowerCase()
    .replace(/&/g, ',')
    .replace(/\s+feat\.?\s+.*$/, '')
    .replace(/\s+ft\.?\s+.*$/, '')
    .replace(/[^\p{L}\p{N}, ]/gu, '')
    .split(',')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * Group tracks that are (likely) the same song released multiple times.
 * Only groups with 2+ tracks are returned, largest first.
 */
export function findDuplicateGroups(tracks: Track[]): DuplicateGroup[] {
  const byKey = new Map<string, Track[]>()
  for (const track of tracks) {
    const title = normalizeTitle(track.name || '')
    const artist = normalizeArtist(track.artist || '')
    if (!title || !artist) continue
    const key = `${title} || ${artist}`
    const list = byKey.get(key)
    if (list) list.push(track)
    else byKey.set(key, [track])
  }
  return [...byKey.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, name: list[0].name, artist: list[0].artist, tracks: list }))
    .sort((a, b) => b.tracks.length - a.tracks.length || a.name.localeCompare(b.name))
}

/** Ids of every track except the first of each group ("keep one copy"). */
export function duplicateIdsToStage(groups: DuplicateGroup[]): string[] {
  return groups.flatMap((g) => g.tracks.slice(1).map((t) => t.id))
}
