import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearStudioState, loadStudioState, saveStudioState } from './persist'

afterEach(() => vi.unstubAllGlobals())

function stubStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
  })
  return store
}

const sample = {
  selectedIds: ['a', 'b'],
  stagingSortOrder: 'bpm_asc',
  stagingOrder: null as string[] | null,
  playlistName: 'My Mix',
  playlistDescription: 'desc',
  tab: 'staging',
  search: 'rock',
  sliders: {
    minBpm: 50, maxBpm: 210, minEnergy: 0, maxEnergy: 100,
    minValence: 0, maxValence: 100, minDance: 0, maxDance: 100,
    minPop: 0, maxPop: 100,
  },
  activeCategory: 'genres',
  activeBinId: 'rock',
  sorts: [{ key: 'addedAt', direction: -1 as const }],
}

describe('studio persist', () => {
  it('round-trips state', () => {
    stubStorage()
    saveStudioState(false, sample)
    expect(loadStudioState(false)).toEqual({ version: 1, ...sample })
  })

  it('keeps demo and real state separate', () => {
    stubStorage()
    saveStudioState(false, sample)
    saveStudioState(true, { ...sample, search: 'demo-search' })
    expect(loadStudioState(false)?.search).toBe('rock')
    expect(loadStudioState(true)?.search).toBe('demo-search')
  })

  it('rejects corrupt or foreign payloads', () => {
    const store = stubStorage()
    store.set('cartridge.studio.v1', 'not-json{{{')
    expect(loadStudioState(false)).toBeNull()
    store.set('cartridge.studio.v1', JSON.stringify({ version: 999, selectedIds: [1, 2, 3] }))
    expect(loadStudioState(false)).toBeNull()
    store.set('cartridge.studio.v1', JSON.stringify({ version: 1, selectedIds: [1, null, 'ok'], sorts: [{ key: 'x' }] }))
    const loaded = loadStudioState(false)
    expect(loaded?.selectedIds).toEqual(['ok'])
    expect(loaded?.sorts).toBeUndefined()
  })

  it('clears state', () => {
    stubStorage()
    saveStudioState(false, sample)
    clearStudioState(false)
    expect(loadStudioState(false)).toBeNull()
  })

  it('survives missing storage', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadStudioState(false)).toBeNull()
    expect(() => saveStudioState(false, sample)).not.toThrow()
  })
})
