/* 离线缓存：应用外壳缓存优先，保证断网也能打开并记录错题。 */
const CACHE_NAME = 'wrongbook-pwa-v4';
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
      // 公式渲染组件：首次安装时尽力缓存，失败不影响核心功能
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

  // 跨域（AI 接口、KaTeX）交给浏览器，不拦截
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async function () {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok && (request.mode === 'navigate' || request.destination === 'script' || request.destination === 'style')) {
          cache.put(request, response.clone());
        }
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
