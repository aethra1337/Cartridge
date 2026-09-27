import { describe, expect, it } from 'vitest'
import { buildViewSearch, parseViewParams } from './viewParams'

describe('view params', () => {
  it('parses tab/cat/bin/q from a query string', () => {
    expect(parseViewParams('?tab=plots&cat=genres&bin=rock&q=fog')).toEqual({
      tab: 'plots',
      cat: 'genres',
      bin: 'rock',
      q: 'fog',
    })
    expect(parseViewParams('')).toEqual({})
  })

  it('round-trips through the builder', () => {
    const search = buildViewSearch('', { tab: 'stats', cat: 'moods', bin: 'amped', q: 'x' })
    expect(parseViewParams(search)).toEqual({ tab: 'stats', cat: 'moods', bin: 'amped', q: 'x' })
  })

  it('omits defaults for short links', () => {
    expect(buildViewSearch('', { tab: 'tracks', cat: 'genres', bin: 'all', q: '' })).toBe('')
  })

  it('preserves unrelated keys like demo', () => {
    const search = buildViewSearch('?demo=1', { tab: 'plots' })
    expect(search).toContain('demo=1')
    expect(search).toContain('tab=plots')
    expect(parseViewParams(search).tab).toBe('plots')
  })

  it('removes a param when it returns to default', () => {
    expect(buildViewSearch('?tab=plots&demo=1', { tab: 'tracks' })).toBe('?demo=1')
  })
})
