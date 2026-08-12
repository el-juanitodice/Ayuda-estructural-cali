/**
 * Service Worker — precache del app shell (BRIEF §4.1: debe abrir en modo avión).
 *
 * Estrategia:
 *  - Assets compilados (/assets/*, con hash en el nombre): cache-first para siempre.
 *  - Navegaciones (HTML): red primero, caché si no hay señal.
 *  - /api/*: NUNCA se cachea aquí; los datos offline viven en IndexedDB (Dexie),
 *    que es la fuente de verdad local con su propia cola de sincronización.
 */

const CACHE = 'shell-v1';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((llaves) => Promise.all(llaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // datos: IndexedDB manda

  // Assets con hash: cache-first
  if (url.pathname.startsWith('/assets/')) {
    ev.respondWith(
      caches.match(ev.request).then((hit) => hit || fetch(ev.request).then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(ev.request, copia));
        return r;
      })),
    );
    return;
  }

  // Navegaciones: red primero, shell cacheado sin señal
  if (ev.request.mode === 'navigate') {
    ev.respondWith(
      fetch(ev.request)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copia));
          return r;
        })
        .catch(() => caches.match('/index.html')),
    );
  }
});
