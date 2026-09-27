import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

afterEach(() => vi.unstubAllGlobals())

describe('copyText', () => {
  it('returns true when clipboard API succeeds', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => {} } })
    await expect(copyText('spotify:track:abc')).resolves.toBe(true)
  })

  it('falls back to execCommand when clipboard API fails', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: async () => { throw new Error('denied') } },
    })
    const area = { value: '', style: {} as Record<string, string>, select: () => {} }
    vi.stubGlobal('document', {
      createElement: () => area,
      body: { appendChild: () => {}, removeChild: () => {} },
      execCommand: () => true,
    })
    await expect(copyText('spotify:track:abc')).resolves.toBe(true)
  })

  it('returns false when everything fails', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: async () => { throw new Error('denied') } },
    })
    vi.stubGlobal('document', {
      createElement: () => { throw new Error('no dom') },
    })
    await expect(copyText('x')).resolves.toBe(false)
  })
})
