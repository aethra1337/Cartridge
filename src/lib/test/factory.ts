import type { AudioFeatures, Track } from '../types'

let counter = 0

export function makeFeatures(overrides: Partial<AudioFeatures> = {}): AudioFeatures {
  return {
    danceability: 0.6,
    energy: 0.6,
    valence: 0.6,
    tempo: 120,
    acousticness: 0.2,
    instrumentalness: 0.02,
    liveness: 0.1,
    loudness: -8,
    speechiness: 0.05,
    key: 0,
    mode: 1,
    timeSignature: 4,
    durationMs: 210000,
    ...overrides,
  }
}

export function makeTrack(overrides: Partial<Track> = {}): Track {
  counter += 1
  const id = overrides.id ?? `test-track-${counter}`
  return {
    id,
    uri: `spotify:track:${id}`,
    name: 'Test Song',
    artist: 'Test Artist',
    artistGenres: ['pop'],
    album: 'Test Album',
    albumImageUrl: null,
    releaseDate: '2020-05-01',
    year: 2020,
    decade: '2020s',
    previewUrl: null,
    addedAt: new Date(Date.now() - counter * 86400000).toISOString(),
    popularity: 50,
    explicit: false,
    durationMs: 210000,
    audioFeatures: makeFeatures(),
    ...overrides,
  }
}

export function makeTracks(count: number, overrides: Partial<Track> = {}): Track[] {
  return Array.from({ length: count }, (_, i) =>
    makeTrack({ id: `test-track-${counter}-${i}`, ...overrides })
  )
}
