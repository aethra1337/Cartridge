/** Named filter snapshots: search + sliders + category/bin + sorts. */
export interface SavedView {
  id: string
  name: string
  search: string
  sliders: Record<string, number>
  activeCategory: string
  activeBinId: string
  sorts: { key: string; direction: 1 | -1 }[]
}

export const MAX_SAVED_VIEWS = 20
const KEY = 'cartridge.views.v1'

function storage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

function sanitize(raw: unknown): SavedView[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (v): v is SavedView =>
        Boolean(v) &&
        typeof v === 'object' &&
        typeof (v as SavedView).id === 'string' &&
        typeof (v as SavedView).name === 'string'
    )
    .slice(0, MAX_SAVED_VIEWS)
}

export function loadSavedViews(): SavedView[] {
  const store = storage()
  if (!store) return []
  try {
    return sanitize(JSON.parse(store.getItem(KEY) || 'null'))
  } catch {
    return []
  }
}

export function saveSavedViews(views: SavedView[]): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(KEY, JSON.stringify(views.slice(0, MAX_SAVED_VIEWS)))
  } catch {
    // quota — best effort
  }
}

export function createSavedView(name: string, snapshot: Omit<SavedView, 'id' | 'name'>): SavedView | null {
  const clean = name.trim().slice(0, 60)
  if (!clean) return null
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `view-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  return { id, name: clean, ...snapshot }
}
