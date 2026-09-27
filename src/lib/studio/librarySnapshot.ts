/** Previous-library snapshot for the removed-tracks diff.
 * Stores id -> "name — artist" so removed songs still have readable labels.
 */
export interface LibrarySnapshot {
  at: number
  entries: Record<string, string>
}

export const MAX_SNAPSHOT_ENTRIES = 20000
const KEY = 'cartridge.librarySnapshot.v1'

function storage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

export function loadSnapshot(): LibrarySnapshot | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = JSON.parse(store.getItem(KEY) || 'null') as LibrarySnapshot | null
    if (!raw || typeof raw.at !== 'number' || !raw.entries || typeof raw.entries !== 'object') return null
    return raw
  } catch {
    return null
  }
}

export function saveSnapshot(entries: Record<string, string>): void {
  const store = storage()
  if (!store) return
  try {
    const keys = Object.keys(entries).slice(0, MAX_SNAPSHOT_ENTRIES)
    const capped: Record<string, string> = {}
    for (const k of keys) capped[k] = entries[k]
    store.setItem(KEY, JSON.stringify({ at: Date.now(), entries: capped } satisfies LibrarySnapshot))
  } catch {
    // quota — best effort
  }
}

/** Ids present in the snapshot but missing from the current library. */
export function diffRemoved(snapshot: LibrarySnapshot | null, currentIds: Set<string>): { id: string; label: string }[] {
  if (!snapshot) return []
  return Object.entries(snapshot.entries)
    .filter(([id]) => !currentIds.has(id))
    .map(([id, label]) => ({ id, label }))
    .slice(0, 500)
}
