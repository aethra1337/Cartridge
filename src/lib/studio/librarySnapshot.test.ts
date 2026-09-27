import { afterEach, describe, expect, it, vi } from 'vitest'
import { diffRemoved, loadSnapshot, saveSnapshot } from './librarySnapshot'

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

describe('librarySnapshot', () => {
  it('round-trips and diffs removed ids', () => {
    stubStorage()
    saveSnapshot({ a: 'Song A — X', b: 'Song B — Y', c: 'Song C — Z' })
    const snap = loadSnapshot()!
    expect(diffRemoved(snap, new Set(['a', 'c']))).toEqual([{ id: 'b', label: 'Song B — Y' }])
    expect(diffRemoved(snap, new Set(['a', 'b', 'c']))).toEqual([])
  })

  it('returns empty without a snapshot and rejects corrupt payloads', () => {
    stubStorage()
    expect(loadSnapshot()).toBeNull()
    expect(diffRemoved(null, new Set())).toEqual([])
    const store = stubStorage()
    store.set('cartridge.librarySnapshot.v1', '{"at":"nope"}')
    expect(loadSnapshot()).toBeNull()
  })
})
