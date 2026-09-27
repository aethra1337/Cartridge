/** Data-space bounding box of a drag, or null when it was a plain click. */
export function boxSelectBounds(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  return {
    xMin: Math.min(start.x, end.x),
    xMax: Math.max(start.x, end.x),
    yMin: Math.min(start.y, end.y),
    yMax: Math.max(start.y, end.y),
  }
}

export function pointsInBox<T extends { x: number; y: number }>(
  points: T[],
  box: { xMin: number; xMax: number; yMin: number; yMax: number }
): T[] {
  return points.filter((p) => p.x >= box.xMin && p.x <= box.xMax && p.y >= box.yMin && p.y <= box.yMax)
}

export const DRAG_THRESHOLD_PX = 6
