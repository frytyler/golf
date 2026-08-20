/* Boring Bogey Blueprint — service worker. Cache-first shell + runtime cache for offline resilience. */
var CACHE = 'bbb-v1';
var CORE = [
  './', './index.html', './manifest.webmanifest',
  './assets/bbb.css', './assets/charts.js', './assets/dashboard.js',
  './assets/renderer.js', './assets/tracker.js',
  './data/rounds.json', './data/courses/stonebridge.json',
  './courses/stonebridge.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        try {
          var url = new URL(e.request.url);
          if (url.origin === location.origin) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          }
        } catch (err) {}
        return res;
      }).catch(function () { return hit; });
    })
  );
});
