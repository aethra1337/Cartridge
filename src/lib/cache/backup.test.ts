import { describe, expect, it } from 'vitest'
import { parseBackup } from './backup'
import { makeTrack } from '../test/factory'

describe('parseBackup', () => {
  it('accepts a valid backup and drops malformed rows', () => {
    const raw = JSON.stringify({
      version: 1,
      app: 'cartridge',
      exportedAt: new Date().toISOString(),
      trackCount: 2,
      tracks: [makeTrack({ id: 'a' }), { id: 42, nope: true }],
    })
    expect(parseBackup(raw)).toHaveLength(1)
  })

  it('rejects foreign, versioned-wrong or empty payloads', () => {
    expect(() => parseBackup('not json')).toThrow()
    expect(() => parseBackup(JSON.stringify({ app: 'other', version: 1, tracks: [] }))).toThrow()
    expect(() => parseBackup(JSON.stringify({ app: 'cartridge', version: 2, tracks: [] }))).toThrow()
    expect(
      () => parseBackup(JSON.stringify({ app: 'cartridge', version: 1, tracks: [] }))
    ).toThrow()
  })
})
