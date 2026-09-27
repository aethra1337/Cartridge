/**
 * Refresh-proof studio: staging selection, sort order and view filters are
 * persisted to localStorage (debounced by the caller) and restored on load.
 * Demo mode uses a separate key so fictional ids never leak into real state.
 */

export interface SlidersState {
  minBpm: number
  maxBpm: number
  minEnergy: number
  maxEnergy: number
  minValence: number
  maxValence: number
  minDance: number
  maxDance: number
  minPop: number
  maxPop: number
}

export interface SortState {
  key: string
  direction: 1 | -1
}

export interface StudioPersistedState {
  version: 1
  /** Capped to avoid quota issues on huge "select all" libraries. */
  selectedIds: string[]
  stagingSortOrder: string
  stagingOrder: string[] | null
  playlistName: string
  playlistDescription: string
  tab: string
  search: string
  sliders: SlidersState
  activeCategory: string
  activeBinId: string
  sorts: SortState[]
}

export const MAX_PERSISTED_IDS = 20000

const keyFor = (demo: boolean) => (demo ? 'cartridge.studio.demo.v1' : 'cartridge.studio.v1')

function storage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

function sanitize(raw: unknown): Partial<StudioPersistedState> | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as Record<string, unknown>
  if (v.version !== 1) return null
  const out: Partial<StudioPersistedState> = { version: 1 }
  if (Array.isArray(v.selectedIds)) {
    out.selectedIds = v.selectedIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_PERSISTED_IDS)
  }
  if (typeof v.stagingSortOrder === 'string') out.stagingSortOrder = v.stagingSortOrder
  if (v.stagingOrder === null || (Array.isArray(v.stagingOrder) && v.stagingOrder.every((id) => typeof id === 'string'))) {
    out.stagingOrder = v.stagingOrder as string[] | null
  }
  if (typeof v.playlistName === 'string') out.playlistName = v.playlistName.slice(0, 200)
  if (typeof v.playlistDescription === 'string') out.playlistDescription = v.playlistDescription.slice(0, 500)
  if (typeof v.tab === 'string') out.tab = v.tab
  if (typeof v.search === 'string') out.search = v.search.slice(0, 200)
  if (v.sliders && typeof v.sliders === 'object') {
    const s = v.sliders as Record<string, unknown>
    const nums = ['minBpm', 'maxBpm', 'minEnergy', 'maxEnergy', 'minValence', 'maxValence', 'minDance', 'maxDance', 'minPop', 'maxPop'] as const
    if (nums.every((k) => typeof s[k] === 'number' && Number.isFinite(s[k]))) {
      out.sliders = {
        minBpm: s.minBpm as number,
        maxBpm: s.maxBpm as number,
        minEnergy: s.minEnergy as number,
        maxEnergy: s.maxEnergy as number,
        minValence: s.minValence as number,
        maxValence: s.maxValence as number,
        minDance: s.minDance as number,
        maxDance: s.maxDance as number,
        minPop: s.minPop as number,
        maxPop: s.maxPop as number,
      }
    }
  }
  if (typeof v.activeCategory === 'string') out.activeCategory = v.activeCategory
  if (typeof v.activeBinId === 'string') out.activeBinId = v.activeBinId
  if (Array.isArray(v.sorts)) {
    const sorts = v.sorts.filter(
      (s): s is SortState =>
        Boolean(s) &&
        typeof s === 'object' &&
        typeof (s as SortState).key === 'string' &&
        ((s as SortState).direction === 1 || (s as SortState).direction === -1)
    )
    if (sorts.length) out.sorts = sorts.slice(0, 5)
  }
  return out
}

export function loadStudioState(demo: boolean): Partial<StudioPersistedState> | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(keyFor(demo))
    if (!raw) return null
    return sanitize(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveStudioState(demo: boolean, state: Omit<StudioPersistedState, 'version'>): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(keyFor(demo), JSON.stringify({ version: 1, ...state }))
  } catch {
    // quota / private mode — persistence is best-effort
  }
}

export function clearStudioState(demo: boolean): void {
  try {
    storage()?.removeItem(keyFor(demo))
  } catch {
    // ignore
  }
}
