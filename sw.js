/* Boring Bogey Blueprint — service worker.
   Network-first for code/data (fresh when online, cache fallback offline).
   Cache-first for images (immutable, heavy). Bump CACHE on any precache change. */
var CACHE = 'bbb-v3';
var CORE = [
  './', './index.html', './manifest.webmanifest',
  './assets/bbb.css', './assets/charts.js', './assets/dashboard.js',
  './assets/renderer.js', './assets/tracker.js',
  './data/rounds.json', './data/courses/stonebridge.json',
  './courses/stonebridge.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
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
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  var sameOrigin = url.origin === location.origin;
  var isImage = sameOrigin && url.pathname.indexOf('/img/') !== -1;

  if (isImage) {
    // cache-first: images never change
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (res) {
          var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return res;
        });
      })
    );
    return;
  }

  // network-first for everything else (html/js/css/json); no-store so a redeploy
  // is never masked by the browser HTTP cache. Falls back to cache offline.
  var opts = sameOrigin ? { cache: 'no-store' } : undefined;
  e.respondWith(
    fetch(e.request, opts).then(function (res) {
      if (sameOrigin) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
