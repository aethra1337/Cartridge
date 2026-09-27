import { describe, expect, it } from 'vitest'
import { buildShareText } from './ShareCard'
import { makeTrack } from '../../lib/test/factory'

describe('buildShareText', () => {
  it('summarizes the library in plain text', () => {
    const fav = makeTrack({ name: 'Big Hit', artist: 'Star Singer', popularity: 95 })
    const text = buildShareText(1200, 300, ['pop', 'rock'], { name: 'Star Singer', count: 40 }, fav, 'Liked Songs')
    // toLocaleString grouping varies by runtime locale (1,200 vs 1.200)
    expect(text).toMatch(/1[.,]200/)
    expect(text).toContain('pop, rock')
    expect(text).toContain('Star Singer')
    expect(text).toContain('Big Hit')
    expect(text).toContain('Liked Songs')
  })

  it('omits empty sections', () => {
    const text = buildShareText(0, 0, [], null, null)
    expect(text).toContain('0 tracks')
    expect(text).not.toContain('Top genres')
    expect(text).not.toContain('Most tracks')
    expect(text).not.toContain('Most popular')
  })
})
