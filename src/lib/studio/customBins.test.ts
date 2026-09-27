import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCustomBin, loadCustomBins, matchCustomBin, saveCustomBins } from './customBins'
import { makeTrack } from '../test/factory'

afterEach(() => vi.unstubAllGlobals())

function stubStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
  })
}

describe('matchCustomBin', () => {
  it('matches case-insensitive genre substrings', () => {
    const rule = { id: 'c1', label: 'Turkish mix', keywords: ['turkish'] }
    expect(matchCustomBin(makeTrack({ artistGenres: ['Turkish Pop'] }), rule)).toBe(true)
    expect(matchCustomBin(makeTrack({ artistGenres: ['rock'] }), rule)).toBe(false)
  })

  it('never matches genre-less tracks', () => {
    const rule = { id: 'c1', label: 'x', keywords: ['pop'] }
    expect(matchCustomBin(makeTrack({ artistGenres: [] }), rule)).toBe(false)
  })
})

describe('createCustomBin', () => {
  it('normalizes label and keywords', () => {
    const rule = createCustomBin('  Workout Rock  ', 'Rock, METAL, x, rock')
    expect(rule?.label).toBe('Workout Rock')
    expect(rule?.keywords).toEqual(['rock', 'metal'])
  })

  it('rejects useless rules', () => {
    expect(createCustomBin('', 'rock')).toBeNull()
    expect(createCustomBin('Name', '')).toBeNull()
    expect(createCustomBin('Name', 'x, y')).toBeNull()
  })
})

describe('custom bins persistence', () => {
  it('round-trips and sanitizes', () => {
    stubStorage()
    saveCustomBins([
      { id: 'a', label: 'Good', keywords: ['rock'] },
      { id: 'b', label: '', keywords: [] },
    ])
    expect(loadCustomBins()).toEqual([{ id: 'a', label: 'Good', keywords: ['rock'] }])
  })
})
