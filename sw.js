/* ============================================================
   KnoW — Service Worker (sw.js)
   Caches all static assets for offline access
   ============================================================ */

const CACHE_NAME = 'know-v2';

// All static files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/write.html',
  '/code.html',
  '/study.html',
  '/plan.html',
  '/allrounder.html',
  '/auth.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
];

/* -----------------------------------------
   INSTALL — cache all static assets
   ----------------------------------------- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

/* -----------------------------------------
   ACTIVATE — clean up old caches
   ----------------------------------------- */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

/* -----------------------------------------
   FETCH — serve from cache, fallback to network
   Strategy: Cache First for static assets
             Network First for API calls
   ----------------------------------------- */
self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Always go to network for API calls — never cache AI/external API responses
  if (
    url.includes('groq.com') ||
    url.includes('firebase') ||
    url.includes('googleapis') ||
    url.includes('openweathermap') ||
    url.includes('gnews.io') ||
    url.includes('nasa.gov') ||
    url.includes('dictionaryapi.dev') ||
    url.includes('frankfurter.app') ||
    url.includes('restcountries.com') ||
    url.includes('dummyjson.com') ||
    url.includes('numbersapi.com') ||
    url.includes('jokeapi.dev') ||
    url.includes('quotable.io')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        // Cache valid responses
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function () {
        // Offline fallback — show homepage from cache
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
