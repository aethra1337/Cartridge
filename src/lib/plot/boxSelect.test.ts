import { describe, expect, it } from 'vitest'
import { boxSelectBounds, pointsInBox } from './boxSelect'

describe('boxSelectBounds', () => {
  it('normalizes drag direction', () => {
    expect(boxSelectBounds({ x: 80, y: 90 }, { x: 20, y: 10 })).toEqual({
      xMin: 20,
      xMax: 80,
      yMin: 10,
      yMax: 90,
    })
  })
})

describe('pointsInBox', () => {
  const pts = [
    { x: 10, y: 10, id: 'a' },
    { x: 50, y: 50, id: 'b' },
    { x: 90, y: 90, id: 'c' },
  ]
  it('selects points inside (edges inclusive)', () => {
    expect(pointsInBox(pts, { xMin: 10, xMax: 50, yMin: 10, yMax: 50 }).map((p) => p.id)).toEqual([
      'a',
      'b',
    ])
  })
  it('returns empty when the box hits nothing', () => {
    expect(pointsInBox(pts, { xMin: 60, xMax: 80, yMin: 60, yMax: 80 })).toEqual([])
  })
})
