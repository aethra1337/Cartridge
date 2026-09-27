import { describe, expect, it } from 'vitest'
import { estimateAudioFeatures } from './audioIntelligence'

const base = { id: 'seed-track-1', name: 'Neon Skyline', duration_ms: 210000, popularity: 60 }

describe('estimateAudioFeatures', () => {
  it('is deterministic for the same input', () => {
    const a = estimateAudioFeatures(base, ['synthwave'])
    const b = estimateAudioFeatures(base, ['synthwave'])
    expect(a).toEqual(b)
  })

  it('varies between different tracks', () => {
    const a = estimateAudioFeatures({ ...base, id: 'track-a' }, ['pop'])
    const b = estimateAudioFeatures({ ...base, id: 'track-b' }, ['pop'])
    expect(a).not.toEqual(b)
  })

  it('stays inside valid Spotify ranges', () => {
    const f = estimateAudioFeatures(base, ['mystery-genre-xyz'])
    expect(f.tempo).toBeGreaterThanOrEqual(55)
    expect(f.tempo).toBeLessThanOrEqual(210)
    expect(f.energy).toBeGreaterThanOrEqual(0.05)
    expect(f.energy).toBeLessThanOrEqual(0.99)
    expect(f.valence).toBeGreaterThanOrEqual(0.05)
    expect(f.danceability).toBeLessThanOrEqual(0.98)
    expect(f.loudness).toBeLessThan(0)
    expect(f.key).toBeGreaterThanOrEqual(0)
    expect(f.key).toBeLessThanOrEqual(11)
  })

  it('reflects genre profiles (metal hits harder than ambient)', () => {
    const metal = estimateAudioFeatures(base, ['metal'])
    const ambient = estimateAudioFeatures(base, ['ambient'])
    expect(metal.energy).toBeGreaterThan(ambient.energy)
    expect(metal.tempo).toBeGreaterThan(ambient.tempo)
  })

  it('reacts to title modifiers', () => {
    const normal = estimateAudioFeatures({ ...base, id: 't-normal', name: 'Plain Song' }, ['pop'])
    const acoustic = estimateAudioFeatures({ ...base, id: 't-normal', name: 'Plain Song (Acoustic)' }, ['pop'])
    expect(acoustic.acousticness).toBeGreaterThan(normal.acousticness)
    expect(acoustic.energy).toBeLessThan(normal.energy)
  })
})
