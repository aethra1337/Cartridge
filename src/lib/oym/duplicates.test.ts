import { describe, expect, it } from 'vitest'
import { duplicateIdsToStage, findDuplicateGroups, normalizeArtist, normalizeTitle } from './duplicates'
import { makeTrack } from '../test/factory'

describe('normalizeTitle', () => {
  it('strips release suffixes so versions collide', () => {
    expect(normalizeTitle('Midnight Ferry (Remastered 2011)')).toBe('midnight ferry')
    expect(normalizeTitle('midnight ferry')).toBe('midnight ferry')
    expect(normalizeTitle('Midnight Ferry [Live]')).toBe('midnight ferry')
    expect(normalizeTitle('MIDNIGHT  FERRY')).toBe('midnight ferry')
  })

  it('keeps genuinely different titles apart', () => {
    expect(normalizeTitle('Midnight Ferry')).not.toBe(normalizeTitle('Morning Ferry'))
  })
})

describe('normalizeArtist', () => {
  it('unifies separators and case', () => {
    expect(normalizeArtist('Neon Coastlines & Glass Harbor')).toBe('neon coastlines, glass harbor')
    expect(normalizeArtist('  Neon Coastlines ,  Glass Harbor ')).toBe('neon coastlines, glass harbor')
  })
})

describe('findDuplicateGroups', () => {
  it('groups different releases of the same song', () => {
    const tracks = [
      makeTrack({ name: 'Midnight Ferry', artist: 'Neon Coastlines' }),
      makeTrack({ name: 'Midnight Ferry (Remastered 2011)', artist: 'Neon Coastlines' }),
      makeTrack({ name: 'Morning Ferry', artist: 'Neon Coastlines' }),
    ]
    const groups = findDuplicateGroups(tracks)
    expect(groups).toHaveLength(1)
    expect(groups[0].tracks).toHaveLength(2)
  })

  it('separates same title by different artists', () => {
    const tracks = [
      makeTrack({ name: 'Halo', artist: 'Artist A' }),
      makeTrack({ name: 'Halo', artist: 'Artist B' }),
    ]
    expect(findDuplicateGroups(tracks)).toHaveLength(0)
  })

  it('returns empty for unique libraries', () => {
    const tracks = [
      makeTrack({ name: 'Song One', artist: 'Artist A' }),
      makeTrack({ name: 'Song Two', artist: 'Artist B' }),
    ]
    expect(findDuplicateGroups(tracks)).toHaveLength(0)
  })

  it('sorts largest groups first', () => {
    const tracks = [
      makeTrack({ name: 'Pair', artist: 'X' }),
      makeTrack({ name: 'Pair (Live)', artist: 'X' }),
      makeTrack({ name: 'Trio', artist: 'Y' }),
      makeTrack({ name: 'Trio [Remastered]', artist: 'Y' }),
      makeTrack({ name: 'Trio (Acoustic)', artist: 'Y' }),
    ]
    const groups = findDuplicateGroups(tracks)
    expect(groups.map((g) => g.tracks.length)).toEqual([3, 2])
  })
})

describe('duplicateIdsToStage', () => {
  it('keeps the first copy of each group', () => {
    const tracks = [
      makeTrack({ id: 'keep', name: 'Pair', artist: 'X' }),
      makeTrack({ id: 'stage-me', name: 'Pair (Live)', artist: 'X' }),
    ]
    expect(duplicateIdsToStage(findDuplicateGroups(tracks))).toEqual(['stage-me'])
  })
})
