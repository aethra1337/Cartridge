import { describe, expect, it } from 'vitest'
import { normalizeLoopbackUrl } from './loopback'

describe('normalizeLoopbackUrl', () => {
  it('rewrites localhost to the 127.0.0.1 redirect host, preserving path', () => {
    expect(normalizeLoopbackUrl('http://localhost:5173/app?demo=1', 'http://127.0.0.1:5173/callback')).toBe(
      'http://127.0.0.1:5173/app?demo=1'
    )
  })

  it('upgrades scheme to match the redirect URI', () => {
    expect(normalizeLoopbackUrl('http://localhost:5173/app', 'https://localhost:5173/callback')).toBe(
      'https://localhost:5173/app'
    )
  })

  it('returns null when already aligned or non-loopback', () => {
    expect(normalizeLoopbackUrl('http://127.0.0.1:5173/app', 'http://127.0.0.1:5173/callback')).toBeNull()
    expect(normalizeLoopbackUrl('https://myapp.com/app', 'https://myapp.com/callback')).toBeNull()
    expect(normalizeLoopbackUrl('https://myapp.com/app', 'http://127.0.0.1:5173/callback')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(normalizeLoopbackUrl('not-a-url', 'http://127.0.0.1:5173/callback')).toBeNull()
    expect(normalizeLoopbackUrl('http://localhost:5173/', undefined)).toBeNull()
  })
})
