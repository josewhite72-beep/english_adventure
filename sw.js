const CACHE = 'english-quest-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const PASSTHROUGH = [
  'eq-proxy.vercel.app',
  'api.anthropic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const { method } = e.request;

  // Pass through ALL API/proxy requests — never cache
  const isApiRequest =
    url.hostname.includes('vercel.app') ||
    url.hostname.includes('anthropic.com') ||
    url.pathname.startsWith('/api/');

  if (isApiRequest || PASSTHROUGH.some(domain => url.hostname.includes(domain))) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Non-GET requests bypass cache
  if (method !== 'GET') {
    e.respondWith(fetch(e.request));
    return;
  }

  // App assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
