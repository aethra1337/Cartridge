import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSavedView, loadSavedViews, saveSavedViews, type SavedView } from './savedViews'

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

const snap = {
  search: 'rock',
  sliders: { minBpm: 90, maxBpm: 140 },
  activeCategory: 'genres',
  activeBinId: 'all',
  sorts: [{ key: 'bpm', direction: -1 as const }],
}

describe('savedViews', () => {
  it('round-trips views', () => {
    stubStorage()
    const view = createSavedView('Workout', snap)!
    saveSavedViews([view])
    expect(loadSavedViews()).toEqual([view])
  })

  it('rejects empty names and corrupt payloads', () => {
    stubStorage()
    expect(createSavedView('   ', snap)).toBeNull()
    const store = stubStorage()
    store.set('cartridge.views.v1', 'garbage{')
    expect(loadSavedViews()).toEqual([])
  })

  it('caps stored views at the max', () => {
    stubStorage()
    const views: SavedView[] = Array.from({ length: 30 }, (_, i) => createSavedView(`v${i}`, snap)!)
    saveSavedViews(views)
    expect(loadSavedViews()).toHaveLength(20)
  })
})
