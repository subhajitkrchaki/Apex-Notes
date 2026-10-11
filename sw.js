const CACHE_NAME = 'apexnotes-v2';

// Assets to cache using paths relative to this service worker script
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './css/main.css',
  './css/components.css',
  './css/mobile.css',
  './js/app.js',
  './js/storage.js',
  './js/editor.js',
  './js/search.js',
  './js/pwa.js'
];

// Install event - Cache core static assets relative to current scope
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Resolves all relative asset paths against service worker location
      const resolvedUrls = ASSETS_TO_CACHE.map(url => new URL(url, self.location).href);
      return cache.addAll(resolvedUrls);
    }).then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Stale-while-revalidate strategy with offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {
          // Ignore network errors when offline
        });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline navigation fallback resolved relative to service worker scope
        if (event.request.mode === 'navigate') {
          const fallbackIndex = new URL('./index.html', self.location).href;
          return caches.match(fallbackIndex).then(res => {
            if (res) return res;
            return caches.match(new URL('./', self.location).href);
          });
        }
      });
    })
  );
});
