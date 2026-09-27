import type { Track } from '../types'

function feat(track: Track) {
  const f = track.audioFeatures
  return {
    bpm: f?.tempo ?? 120,
    energy: f?.energy ?? 0.5,
    valence: f?.valence ?? 0.5,
    dance: f?.danceability ?? 0.5,
  }
}

/** Cost of mixing a -> b. Lower = smoother transition. Roughly 0..1+. */
export function transitionCost(a: Track, b: Track): number {
  const fa = feat(a)
  const fb = feat(b)
  const bpm = Math.abs(fa.bpm - fb.bpm) / 40
  const energy = Math.abs(fa.energy - fb.energy)
  const valence = Math.abs(fa.valence - fb.valence) * 0.5
  const dance = Math.abs(fa.dance - fb.dance) * 0.5
  return bpm * 0.45 + energy * 0.3 + valence * 0.125 + dance * 0.125
}

/** 0..100 score for a single transition. */
export function transitionScore(a: Track, b: Track): number {
  return Math.max(0, Math.round(100 * (1 - transitionCost(a, b))))
}

/** Overall flow 0..100 for an ordered list. Null when < 2 tracks. */
export function flowScore(tracks: Track[]): number | null {
  if (tracks.length < 2) return null
  let sum = 0
  for (let i = 1; i < tracks.length; i++) sum += transitionScore(tracks[i - 1], tracks[i])
  return Math.round(sum / (tracks.length - 1))
}

/** Per-track transition scores (score of the mix INTO each track). First is null. */
export function transitionScores(tracks: Track[]): (number | null)[] {
  return tracks.map((t, i) => (i === 0 ? null : transitionScore(tracks[i - 1], t)))
}

/**
 * Greedy DJ ordering: start from the lowest-BPM track, always pick the
 * smoothest next mix. Fast, deterministic, good enough for staging.
 */
export function optimizeFlow(tracks: Track[]): Track[] {
  if (tracks.length < 3) return [...tracks]
  const remaining = [...tracks].sort(
    (a, b) => (a.audioFeatures?.tempo ?? 120) - (b.audioFeatures?.tempo ?? 120)
  )
  const ordered: Track[] = [remaining.shift()!]
  while (remaining.length) {
    const last = ordered[ordered.length - 1]
    let best = 0
    let bestCost = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const c = transitionCost(last, remaining[i])
      if (c < bestCost) {
        bestCost = c
        best = i
      }
    }
    ordered.push(remaining.splice(best, 1)[0])
  }
  return ordered
}

export function flowLabel(score: number): string {
  if (score >= 85) return 'Buttery'
  if (score >= 70) return 'Smooth'
  if (score >= 55) return 'Decent'
  if (score >= 40) return 'Bumpy'
  return 'Chaotic'
}
