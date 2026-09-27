/* Cartridge service worker — minimal offline shell.
 * Static same-origin assets: cache-first. Navigations: network-first with
 * index.html fallback so the SPA still opens offline. No Spotify API or
 * IndexedDB content is cached — music always comes fresh from the network.
 */
const CACHE = 'cartridge-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/logo.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {})
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .catch(() => {})
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Only handle same-origin; Spotify API / fonts stay network-only.
  if (url.origin !== self.location.origin) return

  // Navigations: try network, fall back to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy)).catch(() => {})
          return response
        })
        .catch(() => caches.match('/index.html', { ignoreSearch: true }))
    )
    return
  }

  // Static assets: cache-first, populate in background.
  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
    )
  )
})
