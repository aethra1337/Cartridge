import type { CustomBinRule, Track } from '../types'
import { matchCustomBin } from '../studio/customBins'

export type OYMCategory =
  | 'genres'
  | 'moods'
  | 'styles'
  | 'decades'
  | 'added'
  | 'popularity'
  | 'duration'
  | 'sources'
  | 'custom'

export interface OYMBin {
  id: string
  category: OYMCategory
  categoryLabel: string
  label: string
  trackIds: string[]
  trackCount: number
  artistCount: number
  avgBpm?: number
  avgEnergy?: number
}

export function computeAllOYMBins(
  tracks: Track[],
  sourceLabel?: string,
  customRules: CustomBinRule[] = []
): Record<OYMCategory, OYMBin[]> {
  const categories: Record<OYMCategory, Map<string, { label: string; trackIds: Set<string>; artists: Set<string>; totalBpm: number; totalEnergy: number }>> = {
    genres: new Map(),
    moods: new Map(),
    styles: new Map(),
    decades: new Map(),
    added: new Map(),
    popularity: new Map(),
    duration: new Map(),
    sources: new Map(),
    custom: new Map(),
  }

  const getOrCreate = (cat: OYMCategory, id: string, label: string) => {
    let map = categories[cat].get(id)
    if (!map) {
      map = { label, trackIds: new Set(), artists: new Set(), totalBpm: 0, totalEnergy: 0 }
      categories[cat].set(id, map)
    }
    return map
  }

  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000
  const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000
  const fiveYearsAgo = now - 5 * 365 * 24 * 60 * 60 * 1000
  const currentYear = new Date().getFullYear()

  tracks.forEach((track) => {
    const tempo = track.audioFeatures?.tempo || 120
    const energy = track.audioFeatures?.energy !== undefined ? track.audioFeatures.energy : 0.55
    const valence = track.audioFeatures?.valence !== undefined ? track.audioFeatures.valence : 0.5
    const danceability = track.audioFeatures?.danceability !== undefined ? track.audioFeatures.danceability : 0.55
    const acousticness = track.audioFeatures?.acousticness !== undefined ? track.audioFeatures.acousticness : 0.2
    const instrumentalness = track.audioFeatures?.instrumentalness !== undefined ? track.audioFeatures.instrumentalness : 0.05
    const liveness = track.audioFeatures?.liveness !== undefined ? track.audioFeatures.liveness : 0.12
    const durationMin = (track.durationMs || 210000) / 60000
    const addedTime = new Date(track.addedAt).getTime()
    const pop = track.popularity
    const yr = track.year

    const record = (cat: OYMCategory, id: string, label: string) => {
      const bin = getOrCreate(cat, id, label)
      bin.trackIds.add(track.id)
      if (track.artist) bin.artists.add(track.artist)
      bin.totalBpm += tempo
      bin.totalEnergy += energy
    }

    // 1. GENRES
    if (track.artistGenres && track.artistGenres.length > 0) {
      track.artistGenres.forEach((g) => {
        const key = g.trim().toLowerCase()
        if (key) record('genres', key, g.trim())
      })
    } else {
      record('genres', 'unclassified-genre', '(unclassified genre)')
    }

    // 2. MOODS — adapted from OYM. The original used Echo Nest-only
    // scores (sadness/anger/happiness) that don't exist in the Spotify API,
    // so these are energy/valence/danceability equivalents, not copies.
    if (energy >= 0.75 && valence >= 0.5) {
      record('moods', 'amped', 'amped')
    }
    if (danceability >= 0.65) {
      record('moods', 'danceable', 'danceable')
    }
    if (energy <= 0.45 && tempo <= 110) {
      record('moods', 'chill', 'chill')
    }
    if (energy >= 0.7 && valence <= 0.35) {
      record('moods', 'anger', 'anger')
    }
    if (energy <= 0.45 && valence <= 0.35) {
      record('moods', 'sad', 'sad')
    }
    if (valence >= 0.65) {
      record('moods', 'happy', 'happy')
    }

    // 3. STYLES (OYM criteria: loud/quiet by dB, high 0.8+ cutoffs)
    if (!track.explicit) {
      record('styles', 'clean', 'clean')
    } else {
      record('styles', 'explicit', 'explicit')
    }

    const loudness = track.audioFeatures?.loudness ?? -14
    if (loudness <= -10) {
      record('styles', 'quiet', 'quiet')
    }
    if (loudness >= -5) {
      record('styles', 'loud', 'loud')
    }
    if (instrumentalness >= 0.8) {
      record('styles', 'instrumental', 'instrumental')
    }
    if (acousticness >= 0.8) {
      record('styles', 'acoustic', 'acoustic')
    }
    if ((track.audioFeatures?.speechiness ?? 0.03) >= 0.85) {
      record('styles', 'spoken-word', 'spoken word')
    }
    if (liveness >= 0.85 || track.name.toLowerCase().includes('live')) {
      record('styles', 'live', 'live')
    }

    // 4. DECADES (OYM labels; ranges stay dynamic so "Now" never goes stale)
    if (yr && yr < 1950) {
      record('decades', 'oldies', 'Oldies')
    }
    if (yr && yr >= currentYear - 1) {
      record('decades', 'Now', 'Now')
    }
    if (yr && yr >= 2020) {
      record('decades', '2020s', '2020s')
    } else if (yr && yr >= 2010) {
      record('decades', '2010s', '2010s')
    } else if (yr && yr >= 2000) {
      record('decades', '2000s', '2000s')
    } else if (yr && yr >= 1990) {
      record('decades', '1990s', '1990s')
    } else if (yr && yr >= 1980) {
      record('decades', '1980s', '1980s')
    } else if (yr && yr >= 1970) {
      record('decades', '1970s', '1970s')
    } else if (yr && yr >= 1960) {
      record('decades', '1960s', '1960s')
    } else if (yr) {
      record('decades', 'Earlier', '1950s & Earlier')
    }

    // 5. ADDED (OYM bins)
    record('added', 'whenever', 'Whenever')
    if (addedTime >= oneDayAgo) {
      record('added', 'today', 'Today')
    }
    if (addedTime >= oneWeekAgo) {
      record('added', 'in-the-last-week', 'In the last week')
    }
    if (addedTime >= oneMonthAgo) {
      record('added', 'in-the-last-month', 'In the last month')
    }
    if (addedTime >= oneYearAgo) {
      record('added', 'in-the-last-year', 'In the last year')
    }
    if (addedTime < oneYearAgo) {
      record('added', 'over-a-year-ago', 'Over a year ago')
    }
    if (addedTime < twoYearsAgo) {
      record('added', 'over-2-years-ago', 'Over 2 years ago')
    }
    if (addedTime < fiveYearsAgo) {
      record('added', 'over-5-years-ago', 'Over 5 years ago')
    }

    // 6. POPULARITY (OYM criteria)
    if (pop >= 75) {
      record('popularity', 'top-popular', 'top popular')
    } else if (pop >= 50) {
      record('popularity', 'very-popular', 'very popular')
    } else if (pop >= 20) {
      record('popularity', 'somewhat-popular', 'somewhat popular')
    } else {
      record('popularity', 'deep', 'deep')
    }

    // 7. DURATION (OYM bins, minutes)
    if (durationMin < 0.5) {
      record('duration', 'very-very-short', 'Very very short')
    }
    if (durationMin < 1.5) {
      record('duration', 'very-short', 'Very short')
    }
    if (durationMin < 3.0) {
      record('duration', 'short', 'Short')
    }
    if (durationMin >= 3.0 && durationMin < 6.0) {
      record('duration', 'medium', 'Medium')
    }
    if (durationMin >= 6.0) {
      record('duration', 'long', 'Long')
    }
    if (durationMin >= 12.0) {
      record('duration', 'very-long', 'Very long')
    }
    if (durationMin >= 30.0) {
      record('duration', 'very-very-long', 'Very very long')
    }

    // 8. CUSTOM (user-defined rules)
    for (const rule of customRules) {
      if (matchCustomBin(track, rule)) {
        record('custom', rule.id, rule.label)
      }
    }
  })

  // 9. SOURCES (OYM parity: which collection was organized)
  if (sourceLabel && tracks.length > 0) {
    const bin = getOrCreate('sources', 'current-source', sourceLabel)
    tracks.forEach((track) => {
      bin.trackIds.add(track.id)
      if (track.artist) {
        track.artist.split(',').forEach((a) => {
          const name = a.trim()
          if (name) bin.artists.add(name)
        })
      }
      bin.totalBpm += track.audioFeatures?.tempo || 120
      bin.totalEnergy += track.audioFeatures?.energy ?? 0.55
    })
  }

  const categoryLabels: Record<OYMCategory, string> = {
    genres: 'Genres',
    moods: 'Moods',
    styles: 'Styles',
    decades: 'Decades',
    added: 'Added',
    popularity: 'Popularity',
    duration: 'Duration',
    sources: 'Sources',
    custom: 'Custom',
  }

  const result: Record<OYMCategory, OYMBin[]> = {
    genres: [],
    moods: [],
    styles: [],
    decades: [],
    added: [],
    popularity: [],
    duration: [],
    sources: [],
    custom: [],
  }

  // OYM parity: hide bins with fewer than 3 tracks, pin "(unclassified…)" last
  const isUnclassified = (label: string) => label.startsWith('(unclassified')

  for (const cat of Object.keys(categories) as OYMCategory[]) {
    result[cat] = [...categories[cat].entries()]
      .map(([id, data]) => ({
        id,
        category: cat,
        categoryLabel: categoryLabels[cat],
        label: data.label,
        trackIds: [...data.trackIds],
        trackCount: data.trackIds.size,
        artistCount: data.artists.size,
        avgBpm: data.trackIds.size ? Math.round(data.totalBpm / data.trackIds.size) : undefined,
        avgEnergy: data.trackIds.size ? Math.round((data.totalEnergy / data.trackIds.size) * 100) : undefined,
      }))
      .filter((b) => b.trackCount >= 3)
      .sort((a, b) => {
        if (isUnclassified(a.label) && !isUnclassified(b.label)) return 1
        if (!isUnclassified(a.label) && isUnclassified(b.label)) return -1
        return b.trackCount - a.trackCount
      })
  }

  return result
}
