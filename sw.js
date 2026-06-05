// Steve's Health Protocol — service worker (offline shell)
const CACHE = 'shp-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Never intercept Firebase/Google network calls — always go straight to network.
  if (req.url.includes('googleapis.com') || req.url.includes('firebaseio.com') ||
      req.url.includes('firebasestorage') || req.url.includes('gstatic.com/firebasejs')) {
    return;
  }
  const sameOrigin = req.url.startsWith(self.location.origin);
  if (!sameOrigin) return; // let cross-origin (fonts CDN, etc.) hit the network directly

  // Network-first for same-origin assets so app updates always propagate;
  // fall back to cache only when offline.
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
