import { describe, expect, it } from 'vitest'
import { PLAYLIST_PRESETS } from './presets'
import { makeFeatures, makeTrack } from '../test/factory'

describe('PLAYLIST_PRESETS', () => {
  it('every preset filters and sorts without throwing', () => {
    const tracks = [
      makeTrack({ audioFeatures: makeFeatures({ tempo: 140, energy: 0.9 }) }),
      makeTrack({ audioFeatures: makeFeatures({ tempo: 80, energy: 0.2 }), popularity: 10 }),
      makeTrack({ popularity: 95 }),
    ]
    for (const preset of PLAYLIST_PRESETS) {
      const picked = tracks.filter(preset.filter).sort(preset.sort)
      expect(Array.isArray(picked)).toBe(true)
      expect(preset.suggestedPlaylistTitle.length).toBeGreaterThan(0)
    }
  })

  it('workout preset picks fast tracks', () => {
    const preset = PLAYLIST_PRESETS.find((p) => p.id === 'workout-high-bpm')!
    const fast = makeTrack({ audioFeatures: makeFeatures({ tempo: 140, energy: 0.9 }) })
    const slow = makeTrack({ audioFeatures: makeFeatures({ tempo: 70, energy: 0.2 }) })
    expect([fast, slow].filter(preset.filter)).toEqual([fast])
  })

  it('hidden gems preset picks low popularity tracks', () => {
    const preset = PLAYLIST_PRESETS.find((p) => p.id === 'hidden-underground-gems')!
    const gem = makeTrack({ popularity: 12 })
    const hit = makeTrack({ popularity: 95 })
    expect([gem, hit].filter(preset.filter)).toEqual([gem])
  })
})
