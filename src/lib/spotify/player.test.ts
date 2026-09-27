import { describe, expect, it } from 'vitest'
import { decidePlaybackMode } from './player'

describe('decidePlaybackMode', () => {
  it('plays full tracks when the device is ready and the account is Premium', () => {
    expect(decidePlaybackMode({ previewUrl: 'https://x' }, true, true)).toBe('full')
    expect(decidePlaybackMode({ previewUrl: null }, true, true)).toBe('full')
  })

  it('falls back to 30s previews without a ready device', () => {
    expect(decidePlaybackMode({ previewUrl: 'https://x' }, false, true)).toBe('preview')
    expect(decidePlaybackMode({ previewUrl: 'https://x' }, true, false)).toBe('preview')
    expect(decidePlaybackMode({ previewUrl: 'https://x' }, false, null)).toBe('preview')
  })

  it('reports none when neither full playback nor a preview exists', () => {
    expect(decidePlaybackMode({ previewUrl: null }, false, true)).toBe('none')
    expect(decidePlaybackMode({ previewUrl: null }, true, false)).toBe('none')
  })
})
