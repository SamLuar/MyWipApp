const CACHE_NAME = 'wip-cache-v1';

const ASSETS_TO_CACHE = [
  './',
  './data/hours.json',
  './data/projects.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './styles.css',
  './app.js',
  './index.html',
];

//Instalação:
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

//Ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
        return Promise.all(
            keys.filter(key => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
    })
  );
  self.clients.claim();
});

//pedidos
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
            return cachedResponse;
        }
        return fetch(event.request);
    })
  );
});