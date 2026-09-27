import { describe, expect, it } from 'vitest'
import { buildDemoTracks } from './tracks'
import { computeAllOYMBins } from '../oym/bins'
import { findDuplicateGroups } from '../oym/duplicates'

describe('buildDemoTracks', () => {
  it('builds a sizable library with unique ids and full audio coverage', () => {
    const tracks = buildDemoTracks()
    expect(tracks.length).toBeGreaterThanOrEqual(40)
    expect(new Set(tracks.map((t) => t.id)).size).toBe(tracks.length)
    expect(tracks.every((t) => Boolean(t.audioFeatures))).toBe(true)
  })

  it('spans multiple decades and genres', () => {
    const tracks = buildDemoTracks()
    const decades = new Set(tracks.map((t) => t.decade))
    expect(decades.size).toBeGreaterThanOrEqual(4)
    const bins = computeAllOYMBins(tracks)
    expect(bins.genres.length).toBeGreaterThanOrEqual(5)
  })

  it('contains at least one intentional duplicate pair', () => {
    const groups = findDuplicateGroups(buildDemoTracks())
    expect(groups.length).toBeGreaterThanOrEqual(1)
    expect(groups.some((g) => g.name === 'Midnight Ferry')).toBe(true)
  })

  it('keeps popularity and tempo in valid ranges', () => {
    for (const t of buildDemoTracks()) {
      expect(t.popularity).toBeGreaterThanOrEqual(0)
      expect(t.popularity).toBeLessThanOrEqual(100)
      expect(t.audioFeatures!.tempo).toBeGreaterThanOrEqual(55)
      expect(t.audioFeatures!.tempo).toBeLessThanOrEqual(210)
    }
  })
})
