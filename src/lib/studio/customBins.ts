import type { CustomBinRule, Track } from '../types'

export const MAX_CUSTOM_BINS = 20
const STORAGE_KEY = 'cartridge.customBins.v1'

/** A track matches when any Spotify genre contains any rule keyword. */
export function matchCustomBin(track: Track, rule: CustomBinRule): boolean {
  if (!rule.keywords.length) return false
  const genres = (track.artistGenres || []).map((g) => g.toLowerCase())
  if (!genres.length) return false
  return rule.keywords.some((keyword) => genres.some((genre) => genre.includes(keyword)))
}

/** Validate + normalize user input; null when the rule would be useless. */
export function createCustomBin(label: string, keywordsRaw: string): CustomBinRule | null {
  const cleanLabel = label.trim().slice(0, 40)
  const keywords = keywordsRaw
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 2)
    .slice(0, 10)
  if (!cleanLabel || !keywords.length) return null
  const id = `custom-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
  return { id, label: cleanLabel, keywords: [...new Set(keywords)] }
}

function sanitize(raw: unknown): CustomBinRule[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (r): r is CustomBinRule =>
        Boolean(r) &&
        typeof r === 'object' &&
        typeof (r as CustomBinRule).id === 'string' &&
        typeof (r as CustomBinRule).label === 'string' &&
        Array.isArray((r as CustomBinRule).keywords)
    )
    .map((r) => ({
      id: r.id,
      label: r.label.trim().slice(0, 40),
      keywords: r.keywords
        .filter((k): k is string => typeof k === 'string')
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length >= 2)
        .slice(0, 10),
    }))
    .filter((r) => r.label.length > 0 && r.keywords.length > 0)
    .slice(0, MAX_CUSTOM_BINS)
}

export function loadCustomBins(): CustomBinRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return sanitize(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveCustomBins(rules: CustomBinRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules.slice(0, MAX_CUSTOM_BINS)))
  } catch {
    // best-effort
  }
}
