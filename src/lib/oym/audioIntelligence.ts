import type { AudioFeatures } from '../types'

interface GenreAcousticProfile {
  bpmRange: [number, number]
  energyRange: [number, number]
  danceRange: [number, number]
  valenceRange: [number, number]
  acousticRange: [number, number]
  speechRange: [number, number]
  instrumentalRange: [number, number]
}

// Extensive genre acoustic mappings based on Echo Nest / Spotify Audio Analysis data
const GENRE_PROFILES: Record<string, GenreAcousticProfile> = {
  // Electronic / Dance
  edm: { bpmRange: [124, 132], energyRange: [0.75, 0.95], danceRange: [0.65, 0.85], valenceRange: [0.45, 0.8], acousticRange: [0.01, 0.1], speechRange: [0.04, 0.12], instrumentalRange: [0.2, 0.7] },
  house: { bpmRange: [120, 128], energyRange: [0.7, 0.9], danceRange: [0.7, 0.9], valenceRange: [0.5, 0.85], acousticRange: [0.02, 0.15], speechRange: [0.04, 0.09], instrumentalRange: [0.3, 0.8] },
  techno: { bpmRange: [125, 140], energyRange: [0.75, 0.95], danceRange: [0.65, 0.85], valenceRange: [0.2, 0.5], acousticRange: [0.01, 0.08], speechRange: [0.04, 0.08], instrumentalRange: [0.6, 0.95] },
  'drum and bass': { bpmRange: [165, 178], energyRange: [0.8, 0.98], danceRange: [0.55, 0.75], valenceRange: [0.3, 0.65], acousticRange: [0.01, 0.08], speechRange: [0.05, 0.15], instrumentalRange: [0.3, 0.85] },
  dubstep: { bpmRange: [138, 150], energyRange: [0.8, 0.98], danceRange: [0.55, 0.75], valenceRange: [0.25, 0.55], acousticRange: [0.01, 0.1], speechRange: [0.05, 0.2], instrumentalRange: [0.3, 0.8] },
  synthwave: { bpmRange: [105, 125], energyRange: [0.65, 0.85], danceRange: [0.55, 0.75], valenceRange: [0.4, 0.7], acousticRange: [0.05, 0.2], speechRange: [0.03, 0.07], instrumentalRange: [0.4, 0.9] },

  // Hip Hop & Rap
  'hip hop': { bpmRange: [80, 105], energyRange: [0.55, 0.8], danceRange: [0.7, 0.9], valenceRange: [0.4, 0.7], acousticRange: [0.05, 0.25], speechRange: [0.15, 0.45], instrumentalRange: [0.0, 0.1] },
  rap: { bpmRange: [80, 110], energyRange: [0.6, 0.85], danceRange: [0.68, 0.88], valenceRange: [0.35, 0.7], acousticRange: [0.03, 0.2], speechRange: [0.2, 0.5], instrumentalRange: [0.0, 0.05] },
  trap: { bpmRange: [130, 155], energyRange: [0.65, 0.88], danceRange: [0.72, 0.92], valenceRange: [0.3, 0.65], acousticRange: [0.02, 0.18], speechRange: [0.12, 0.4], instrumentalRange: [0.0, 0.1] },
  drill: { bpmRange: [138, 148], energyRange: [0.65, 0.85], danceRange: [0.65, 0.85], valenceRange: [0.25, 0.5], acousticRange: [0.05, 0.2], speechRange: [0.18, 0.45], instrumentalRange: [0.0, 0.05] },
  phonk: { bpmRange: [120, 150], energyRange: [0.75, 0.95], danceRange: [0.6, 0.8], valenceRange: [0.2, 0.5], acousticRange: [0.01, 0.15], speechRange: [0.08, 0.25], instrumentalRange: [0.3, 0.8] },

  // Pop & R&B
  pop: { bpmRange: [98, 128], energyRange: [0.55, 0.82], danceRange: [0.62, 0.82], valenceRange: [0.45, 0.8], acousticRange: [0.08, 0.35], speechRange: [0.04, 0.12], instrumentalRange: [0.0, 0.05] },
  'dance pop': { bpmRange: [115, 130], energyRange: [0.7, 0.88], danceRange: [0.7, 0.88], valenceRange: [0.55, 0.85], acousticRange: [0.03, 0.2], speechRange: [0.04, 0.1], instrumentalRange: [0.0, 0.05] },
  'r&b': { bpmRange: [75, 105], energyRange: [0.4, 0.68], danceRange: [0.58, 0.78], valenceRange: [0.35, 0.65], acousticRange: [0.15, 0.5], speechRange: [0.04, 0.15], instrumentalRange: [0.0, 0.08] },
  soul: { bpmRange: [75, 115], energyRange: [0.45, 0.7], danceRange: [0.55, 0.75], valenceRange: [0.45, 0.75], acousticRange: [0.2, 0.6], speechRange: [0.04, 0.1], instrumentalRange: [0.0, 0.1] },
  funk: { bpmRange: [100, 122], energyRange: [0.65, 0.85], danceRange: [0.72, 0.9], valenceRange: [0.65, 0.9], acousticRange: [0.08, 0.3], speechRange: [0.05, 0.15], instrumentalRange: [0.05, 0.4] },

  // Rock & Metal
  rock: { bpmRange: [110, 145], energyRange: [0.65, 0.9], danceRange: [0.4, 0.65], valenceRange: [0.35, 0.7], acousticRange: [0.05, 0.3], speechRange: [0.03, 0.09], instrumentalRange: [0.01, 0.25] },
  'indie rock': { bpmRange: [108, 140], energyRange: [0.55, 0.82], danceRange: [0.45, 0.68], valenceRange: [0.35, 0.68], acousticRange: [0.1, 0.4], speechRange: [0.03, 0.08], instrumentalRange: [0.02, 0.3] },
  metal: { bpmRange: [120, 165], energyRange: [0.85, 0.99], danceRange: [0.3, 0.55], valenceRange: [0.15, 0.45], acousticRange: [0.001, 0.08], speechRange: [0.05, 0.18], instrumentalRange: [0.05, 0.5] },
  punk: { bpmRange: [140, 180], energyRange: [0.8, 0.98], danceRange: [0.4, 0.6], valenceRange: [0.45, 0.8], acousticRange: [0.01, 0.12], speechRange: [0.06, 0.15], instrumentalRange: [0.0, 0.1] },
  'hard rock': { bpmRange: [115, 150], energyRange: [0.75, 0.95], danceRange: [0.38, 0.6], valenceRange: [0.3, 0.65], acousticRange: [0.01, 0.15], speechRange: [0.04, 0.1], instrumentalRange: [0.02, 0.2] },

  // Turkish Music
  'turkish pop': { bpmRange: [100, 130], energyRange: [0.55, 0.85], danceRange: [0.6, 0.82], valenceRange: [0.45, 0.78], acousticRange: [0.12, 0.45], speechRange: [0.04, 0.12], instrumentalRange: [0.0, 0.05] },
  'turkish rock': { bpmRange: [105, 142], energyRange: [0.6, 0.88], danceRange: [0.42, 0.66], valenceRange: [0.3, 0.65], acousticRange: [0.1, 0.4], speechRange: [0.03, 0.08], instrumentalRange: [0.01, 0.2] },
  'anatolian rock': { bpmRange: [95, 135], energyRange: [0.55, 0.82], danceRange: [0.45, 0.68], valenceRange: [0.35, 0.7], acousticRange: [0.15, 0.5], speechRange: [0.03, 0.08], instrumentalRange: [0.05, 0.35] },
  'turkish hip hop': { bpmRange: [82, 108], energyRange: [0.58, 0.82], danceRange: [0.68, 0.88], valenceRange: [0.35, 0.68], acousticRange: [0.05, 0.25], speechRange: [0.15, 0.45], instrumentalRange: [0.0, 0.05] },
  arabesk: { bpmRange: [70, 95], energyRange: [0.45, 0.75], danceRange: [0.35, 0.58], valenceRange: [0.15, 0.4], acousticRange: [0.25, 0.65], speechRange: [0.03, 0.07], instrumentalRange: [0.0, 0.1] },
  'turkish folk': { bpmRange: [75, 120], energyRange: [0.35, 0.65], danceRange: [0.4, 0.68], valenceRange: [0.3, 0.65], acousticRange: [0.45, 0.85], speechRange: [0.03, 0.08], instrumentalRange: [0.02, 0.3] },

  // Acoustic, Ambient & Chill
  acoustic: { bpmRange: [75, 115], energyRange: [0.2, 0.45], danceRange: [0.4, 0.65], valenceRange: [0.25, 0.6], acousticRange: [0.65, 0.95], speechRange: [0.03, 0.07], instrumentalRange: [0.0, 0.2] },
  folk: { bpmRange: [85, 120], energyRange: [0.3, 0.58], danceRange: [0.45, 0.68], valenceRange: [0.35, 0.7], acousticRange: [0.5, 0.9], speechRange: [0.03, 0.07], instrumentalRange: [0.0, 0.15] },
  ambient: { bpmRange: [60, 90], energyRange: [0.08, 0.3], danceRange: [0.15, 0.4], valenceRange: [0.1, 0.45], acousticRange: [0.5, 0.95], speechRange: [0.03, 0.06], instrumentalRange: [0.6, 0.98] },
  'lo-fi': { bpmRange: [70, 90], energyRange: [0.25, 0.5], danceRange: [0.55, 0.75], valenceRange: [0.3, 0.6], acousticRange: [0.35, 0.75], speechRange: [0.04, 0.12], instrumentalRange: [0.4, 0.9] },
  classical: { bpmRange: [65, 115], energyRange: [0.1, 0.45], danceRange: [0.15, 0.4], valenceRange: [0.15, 0.5], acousticRange: [0.8, 0.99], speechRange: [0.03, 0.06], instrumentalRange: [0.7, 0.99] },
  jazz: { bpmRange: [80, 130], energyRange: [0.3, 0.6], danceRange: [0.45, 0.7], valenceRange: [0.35, 0.75], acousticRange: [0.4, 0.85], speechRange: [0.03, 0.08], instrumentalRange: [0.2, 0.85] },
}

// Default fallback profile for unclassified songs
const DEFAULT_PROFILE: GenreAcousticProfile = {
  bpmRange: [95, 130],
  energyRange: [0.45, 0.78],
  danceRange: [0.5, 0.75],
  valenceRange: [0.4, 0.7],
  acousticRange: [0.1, 0.5],
  speechRange: [0.04, 0.1],
  instrumentalRange: [0.0, 0.2],
}

// Deterministic pseudorandom generator from a string seed (track ID)
function createSeededRandom(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return (offset = 0) => {
    const x = Math.sin(hash + offset) * 10000
    return x - Math.floor(x)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function estimateAudioFeatures(
  track: { id: string; name: string; duration_ms: number; popularity: number; release_date?: string },
  artistGenres: string[] = []
): AudioFeatures {
  const rand = createSeededRandom(track.id)

  // Find matching genre profile
  let matchingProfile = DEFAULT_PROFILE
  const allGenresLower = artistGenres.map((g) => g.toLowerCase())

  for (const [key, profile] of Object.entries(GENRE_PROFILES)) {
    if (allGenresLower.some((g) => g.includes(key))) {
      matchingProfile = profile
      break
    }
  }

  // Adjustments based on track title modifiers
  const titleLower = track.name.toLowerCase()
  let acousticModifier = 0
  let energyModifier = 0
  let bpmModifier = 0
  let valenceModifier = 0

  if (titleLower.includes('acoustic') || titleLower.includes('unplugged') || titleLower.includes('piano')) {
    acousticModifier += 0.5
    energyModifier -= 0.3
    bpmModifier -= 15
  }
  if (titleLower.includes('remix') || titleLower.includes('club') || titleLower.includes('dance mix')) {
    energyModifier += 0.2
    bpmModifier += 10
    valenceModifier += 0.1
  }
  if (titleLower.includes('slowed') || titleLower.includes('reverb')) {
    bpmModifier -= 20
    energyModifier -= 0.2
  }
  if (titleLower.includes('sped up') || titleLower.includes('nightcore')) {
    bpmModifier += 25
    energyModifier += 0.2
  }
  if (titleLower.includes('live')) {
    energyModifier += 0.1
  }

  // Compute realistic values within profile bounds
  const r1 = rand(1)
  const r2 = rand(2)
  const r3 = rand(3)
  const r4 = rand(4)
  const r5 = rand(5)
  const r6 = rand(6)
  const r7 = rand(7)

  const bpmBase = matchingProfile.bpmRange[0] + r1 * (matchingProfile.bpmRange[1] - matchingProfile.bpmRange[0])
  const tempo = Math.round(clamp(bpmBase + bpmModifier, 55, 210))

  const energyBase = matchingProfile.energyRange[0] + r2 * (matchingProfile.energyRange[1] - matchingProfile.energyRange[0])
  const energy = Number(clamp(energyBase + energyModifier, 0.05, 0.99).toFixed(2))

  const danceBase = matchingProfile.danceRange[0] + r3 * (matchingProfile.danceRange[1] - matchingProfile.danceRange[0])
  const danceability = Number(clamp(danceBase, 0.1, 0.98).toFixed(2))

  const valenceBase = matchingProfile.valenceRange[0] + r4 * (matchingProfile.valenceRange[1] - matchingProfile.valenceRange[0])
  const valence = Number(clamp(valenceBase + valenceModifier, 0.05, 0.98).toFixed(2))

  const acousticBase = matchingProfile.acousticRange[0] + r5 * (matchingProfile.acousticRange[1] - matchingProfile.acousticRange[0])
  const acousticness = Number(clamp(acousticBase + acousticModifier, 0.001, 0.99).toFixed(3))

  const speechBase = matchingProfile.speechRange[0] + r6 * (matchingProfile.speechRange[1] - matchingProfile.speechRange[0])
  const speechiness = Number(clamp(speechBase, 0.02, 0.85).toFixed(2))

  const instBase = matchingProfile.instrumentalRange[0] + r7 * (matchingProfile.instrumentalRange[1] - matchingProfile.instrumentalRange[0])
  const instrumentalness = Number(clamp(instBase, 0.0, 0.99).toFixed(2))

  const loudness = Number((-25 + energy * 20 + rand(8) * 3).toFixed(1))
  const liveness = Number((0.08 + (titleLower.includes('live') ? 0.6 : rand(9) * 0.2)).toFixed(2))
  const key = Math.floor(rand(10) * 12)
  const mode = rand(11) > 0.35 ? 1 : 0
  const timeSignature = 4

  return {
    tempo,
    energy,
    danceability,
    valence,
    acousticness,
    instrumentalness,
    liveness,
    loudness,
    speechiness,
    key,
    mode,
    timeSignature,
    durationMs: track.duration_ms || 210000,
  }
}
