const CACHE_VERSION = '26.130';
const CACHE_NAME = `pb-logistics-cache-${CACHE_VERSION}`;
const CACHE_PREFIX = 'pb-logistics-cache-';
const APP_PATH_PREFIX = self.location.pathname.replace(/service-worker\.js$/, '');

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './js/dist/vendor.bundle.js?v=26.130',
  './js/dist/app.bundle.js?v=26.130'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

const isCacheableAsset = (url) => {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === APP_PATH_PREFIX || url.pathname === `${APP_PATH_PREFIX}index.html`) return true;
  if (url.pathname === `${APP_PATH_PREFIX}manifest.json`) return true;
  if (url.pathname === `${APP_PATH_PREFIX}icon-192.png`) return true;
  return url.pathname.startsWith(`${APP_PATH_PREFIX}js/dist/`);
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!isCacheableAsset(url)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('./index.html')) || (await cache.match('./'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

