/**
 * Shareable studio views: tab + category + bin + search travel in the URL
 * (?tab=plots&cat=genres&bin=rock&q=…), so any filtered view is linkable.
 * Defaults are omitted to keep links short; unrelated keys (e.g. demo)
 * are preserved untouched.
 */

export interface ViewParams {
  tab?: string
  cat?: string
  bin?: string
  q?: string
}

export function parseViewParams(search: string): ViewParams {
  const params = new URLSearchParams(search)
  const out: ViewParams = {}
  const tab = params.get('tab')
  if (tab) out.tab = tab
  const cat = params.get('cat')
  if (cat) out.cat = cat
  const bin = params.get('bin')
  if (bin) out.bin = bin
  const q = params.get('q')
  if (q) out.q = q
  return out
}

export function buildViewSearch(current: string, view: ViewParams): string {
  const params = new URLSearchParams(current)
  const setOrDelete = (key: string, value: string | undefined, isDefault: boolean) => {
    if (value === undefined || isDefault) params.delete(key)
    else params.set(key, value)
  }
  setOrDelete('tab', view.tab, view.tab === 'tracks' || view.tab === undefined)
  setOrDelete('cat', view.cat, view.cat === 'genres' || view.cat === undefined)
  setOrDelete('bin', view.bin, !view.bin || view.bin === 'all')
  setOrDelete('q', view.q, !view.q)
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}
