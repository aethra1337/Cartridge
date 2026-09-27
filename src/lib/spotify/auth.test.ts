import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken, resolveRedirectUri } from './auth'

afterEach(() => vi.unstubAllGlobals())

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
  })
  return store
}

describe('resolveRedirectUri', () => {
  it('uses the configured URI when origins match', () => {
    expect(resolveRedirectUri('http://127.0.0.1:5173/callback', 'http://127.0.0.1:5173')).toBe(
      'http://127.0.0.1:5173/callback'
    )
  })

  it('falls back to the current origin when configured URI differs (localhost vs 127.0.0.1)', () => {
    // Regression: verifier/state are origin-scoped, so a cross-origin
    // callback can never be exchanged — previously forced a 2nd login.
    expect(resolveRedirectUri('http://127.0.0.1:5173/callback', 'http://localhost:5173')).toBe(
      'http://localhost:5173/callback'
    )
    expect(resolveRedirectUri('http://localhost:5173/callback', 'http://127.0.0.1:5173')).toBe(
      'http://127.0.0.1:5173/callback'
    )
  })

  it('falls back to the current origin when unset or malformed', () => {
    expect(resolveRedirectUri(undefined, 'http://localhost:5173')).toBe('http://localhost:5173/callback')
    expect(resolveRedirectUri('not-a-url', 'http://localhost:5173')).toBe('http://localhost:5173/callback')
  })
})

describe('getAccessToken', () => {
  it('returns null without a stored session', () => {
    stubStorage()
    expect(getAccessToken()).toBeNull()
  })

  it('returns the token while fresh and null past the safety buffer', () => {
    const tokens = {
      accessToken: 'abc',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3600_000,
    }
    stubStorage({ 'cartridge.spotify.tokens': JSON.stringify(tokens) })
    expect(getAccessToken()).toBe('abc')

    const expiring = { ...tokens, expiresAt: Date.now() + 10_000 }
    stubStorage({ 'cartridge.spotify.tokens': JSON.stringify(expiring) })
    expect(getAccessToken()).toBeNull()
  })

  it('migrates legacy brand keys once', () => {
    const tokens = { accessToken: 'legacy', expiresAt: Date.now() + 3600_000 }
    const store = stubStorage({ 'crates.spotify.tokens': JSON.stringify(tokens) })
    expect(getAccessToken()).toBe('legacy')
    expect(store.get('cartridge.spotify.tokens')).toBe(JSON.stringify(tokens))
    expect(store.has('crates.spotify.tokens')).toBe(false)
  })
})
