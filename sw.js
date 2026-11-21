/* 离线缓存：联网时优先取新文件（保证更新能生效），断网时回退到缓存。 */
const CACHE_NAME = 'wrongbook-pwa-v6';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './localdb.js',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    (async function () {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(SHELL);
      for (const url of CDN_ASSETS) {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res);
        } catch (err) { /* 忽略 */ }
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      const keys = await caches.keys();
      await Promise.all(keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) {
        return caches.delete(key);
      }));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const destination = request.destination;
  const networkFirst = request.mode === 'navigate'
    || destination === 'script'
    || destination === 'style'
    || destination === 'document';

  event.respondWith(
    (async function () {
      const cache = await caches.open(CACHE_NAME);
      if (networkFirst) {
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await cache.match(request);
          if (cached) return cached;
          if (request.mode === 'navigate') {
            const fallback = await cache.match('./index.html');
            if (fallback) return fallback;
          }
          throw err;
        }
      }
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch (err) {
        if (request.mode === 'navigate') {
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
        }
        throw err;
      }
    })()
  );
});
