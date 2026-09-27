import { describe, expect, it } from 'vitest'
import { flowLabel, flowScore, optimizeFlow, transitionScore } from './flow'
import { makeFeatures, makeTrack } from '../test/factory'

describe('transitionScore', () => {
  it('scores identical tracks 100', () => {
    const t = makeTrack()
    expect(transitionScore(t, { ...t })).toBe(100)
  })

  it('scores wildly different tracks low', () => {
    const a = makeTrack({ audioFeatures: makeFeatures({ tempo: 60, energy: 0.1, valence: 0.1, danceability: 0.1 }) })
    const b = makeTrack({ audioFeatures: makeFeatures({ tempo: 180, energy: 0.99, valence: 0.99, danceability: 0.99 }) })
    expect(transitionScore(a, b)).toBeLessThan(50)
  })

  it('stays within 0..100', () => {
    const a = makeTrack({ audioFeatures: makeFeatures({ tempo: 55 }) })
    const b = makeTrack({ audioFeatures: makeFeatures({ tempo: 210 }) })
    const s = transitionScore(a, b)
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(100)
  })
})

describe('flowScore', () => {
  it('returns null for fewer than 2 tracks', () => {
    expect(flowScore([])).toBeNull()
    expect(flowScore([makeTrack()])).toBeNull()
  })

  it('scores a uniform list 100', () => {
    const t = makeTrack()
    expect(flowScore([t, { ...t }, { ...t }])).toBe(100)
  })
})

describe('optimizeFlow', () => {
  it('keeps the same track set and is deterministic', () => {
    const tracks = [
      makeTrack({ audioFeatures: makeFeatures({ tempo: 150 }) }),
      makeTrack({ audioFeatures: makeFeatures({ tempo: 90 }) }),
      makeTrack({ audioFeatures: makeFeatures({ tempo: 120 }) }),
    ]
    const once = optimizeFlow(tracks).map((t) => t.id)
    const twice = optimizeFlow(tracks).map((t) => t.id)
    expect([...once].sort()).toEqual(tracks.map((t) => t.id).sort())
    expect(once).toEqual(twice)
  })

  it('starts from the lowest-BPM track', () => {
    const slow = makeTrack({ audioFeatures: makeFeatures({ tempo: 80 }) })
    const mid = makeTrack({ audioFeatures: makeFeatures({ tempo: 120 }) })
    const fast = makeTrack({ audioFeatures: makeFeatures({ tempo: 160 }) })
    expect(optimizeFlow([fast, mid, slow])[0].id).toBe(slow.id)
  })
})

describe('flowLabel', () => {
  it('labels score bands', () => {
    expect(flowLabel(100)).toBe('Buttery')
    expect(flowLabel(85)).toBe('Buttery')
    expect(flowLabel(70)).toBe('Smooth')
    expect(flowLabel(55)).toBe('Decent')
    expect(flowLabel(40)).toBe('Bumpy')
    expect(flowLabel(0)).toBe('Chaotic')
  })
})
