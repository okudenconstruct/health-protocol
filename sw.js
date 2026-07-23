// Steve's Health Protocol — service worker (offline shell)
const CACHE = 'shp-v5';
const ASSETS = [
  './',
  './index.html',
  './list.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-512.png',
  './sounds/tap.mp3', './sounds/nav.mp3', './sounds/confirm.mp3', './sounds/cancel.mp3',
  './sounds/add.mp3', './sounds/remove.mp3', './sounds/step.mp3', './sounds/toggleOn.mp3',
  './sounds/toggleOff.mp3', './sounds/open.mp3', './sounds/close.mp3', './sounds/save.mp3',
  './sounds/error.mp3', './sounds/xp.mp3', './sounds/hit.mp3', './sounds/chime.mp3',
  './sounds/fanfare.mp3', './sounds/music.mp3'
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
    }).catch(() => caches.match(req).then((hit) => {
      if (hit) return hit;
      // Only page navigations fall back to the app shell — returning HTML for a
      // failed asset request (icon, script) would poison callers expecting that type.
      if (req.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }))
  );
});
