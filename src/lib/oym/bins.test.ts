import { describe, expect, it } from 'vitest'
import { computeAllOYMBins } from './bins'
import { makeFeatures, makeTrack, makeTracks } from '../test/factory'

describe('computeAllOYMBins', () => {
  it('groups tracks by artist genre', () => {
    const tracks = makeTracks(3, { artistGenres: ['rock'] })
    const bins = computeAllOYMBins(tracks)
    const rock = bins.genres.find((b) => b.id === 'rock')
    expect(rock?.trackCount).toBe(3)
    expect(rock?.artistCount).toBeGreaterThan(0)
  })

  it('hides bins with fewer than 3 tracks', () => {
    const tracks = makeTracks(2, { artistGenres: ['lonely-genre'] })
    const bins = computeAllOYMBins(tracks)
    expect(bins.genres.find((b) => b.id === 'lonely-genre')).toBeUndefined()
  })

  it('classifies high-energy, high-valence tracks as amped', () => {
    const tracks = makeTracks(3, {
      audioFeatures: makeFeatures({ energy: 0.9, valence: 0.8 }),
    })
    const bins = computeAllOYMBins(tracks)
    expect(bins.moods.find((b) => b.id === 'amped')?.trackCount).toBe(3)
  })

  it('places tracks in the right decade', () => {
    const tracks = makeTracks(3, { year: 1995 })
    const bins = computeAllOYMBins(tracks)
    expect(bins.decades.find((b) => b.id === '1990s')?.trackCount).toBe(3)
  })

  it('splits popularity into top popular vs deep', () => {
    const hits = makeTracks(3, { popularity: 90 })
    const deep = makeTracks(3, { popularity: 5 })
    const bins = computeAllOYMBins([...hits, ...deep])
    expect(bins.popularity.find((b) => b.id === 'top-popular')?.trackCount).toBe(3)
    expect(bins.popularity.find((b) => b.id === 'deep')?.trackCount).toBe(3)
  })

  it('pins the unclassified genre bin last', () => {
    const classified = makeTracks(3, { artistGenres: ['aaa-genre'] })
    const unclassified = makeTracks(3, { artistGenres: [] })
    const bins = computeAllOYMBins([...classified, ...unclassified])
    const last = bins.genres[bins.genres.length - 1]
    expect(last.label.startsWith('(unclassified')).toBe(true)
  })

  it('records the sources bin when a label is given', () => {
    const tracks = makeTracks(3)
    const bins = computeAllOYMBins(tracks, 'My Playlist')
    expect(bins.sources).toHaveLength(1)
    expect(bins.sources[0].label).toBe('My Playlist')
    expect(bins.sources[0].trackCount).toBe(3)
  })

  it('handles an empty library without crashing', () => {
    const bins = computeAllOYMBins([])
    expect(Object.values(bins).every((list) => list.length === 0)).toBe(true)
  })

  it('never double-counts a track inside one bin', () => {
    const track = makeTrack({ artistGenres: ['rock', 'rock'] })
    const bins = computeAllOYMBins([track, makeTrack({ artistGenres: ['rock'] }), makeTrack({ artistGenres: ['rock'] })])
    expect(bins.genres.find((b) => b.id === 'rock')?.trackCount).toBe(3)
  })

  it('builds custom bins from user rules', () => {
    const tracks = [
      ...makeTracks(3, { artistGenres: ['turkish pop'] }),
      ...makeTracks(3, { artistGenres: ['rock'] }),
    ]
    const bins = computeAllOYMBins(tracks, undefined, [{ id: 'c1', label: 'My Mix', keywords: ['turkish'] }])
    expect(bins.custom).toHaveLength(1)
    expect(bins.custom[0].label).toBe('My Mix')
    expect(bins.custom[0].trackCount).toBe(3)
  })

  it('leaves the custom category empty without rules', () => {
    expect(computeAllOYMBins(makeTracks(3)).custom).toHaveLength(0)
  })
})
