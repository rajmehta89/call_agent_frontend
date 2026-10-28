// Bump this whenever app bundles change in a way that must invalidate an installed PWA.
// v3 cached the pre-permissions-fix Call forwarding chunk; v4 drops dev-server chunks cached before 2026-10-28
// (same names, new code: hydration errors on localhost).
const OFFLINE_CACHE = 'relaydesk-offline-v4'
// The dev server reuses bundle names while their code changes: never cache there.
const DEVELOPMENT = ['localhost', '127.0.0.1'].includes(self.location.hostname)
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/relaydesk-180.png',
  '/icons/relaydesk-192.png',
  '/icons/relaydesk-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((name) => name !== OFFLINE_CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')))
    return
  }

  // Cache immutable Next bundles and app chrome, but never cache API responses or CRM records.
  const isStaticAsset = requestUrl.pathname.startsWith('/_next/static/')
    || requestUrl.pathname.startsWith('/icons/')
    || requestUrl.pathname === '/manifest.webmanifest'
  if (!isStaticAsset || DEVELOPMENT) return

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone()
      caches.open(OFFLINE_CACHE).then((cache) => cache.put(event.request, copy))
    }
    return response
  })))
})
