import { describe, expect, it } from 'vitest'
import { parsePlaylistId } from './api'

describe('parsePlaylistId', () => {
  it('parses spotify: URIs', () => {
    expect(parsePlaylistId('spotify:playlist:abcDEF12345678901234')).toBe('abcDEF12345678901234')
  })

  it('parses open.spotify.com URLs', () => {
    expect(parsePlaylistId('https://open.spotify.com/playlist/abcDEF12345678901234?si=xyz')).toBe(
      'abcDEF12345678901234'
    )
  })

  it('parses localized playlist URLs', () => {
    expect(parsePlaylistId('https://open.spotify.com/intl-tr/playlist/abcDEF12345678901234')).toBe(
      'abcDEF12345678901234'
    )
  })

  it('accepts raw IDs', () => {
    expect(parsePlaylistId('  abcDEF12345678901234  ')).toBe('abcDEF12345678901234')
  })

  it('rejects garbage', () => {
    expect(parsePlaylistId('')).toBeNull()
    expect(parsePlaylistId('not a playlist!!!')).toBeNull()
    expect(parsePlaylistId('https://open.spotify.com/track/abcDEF12345678901234')).toBeNull()
    expect(parsePlaylistId('short')).toBeNull()
  })
})
