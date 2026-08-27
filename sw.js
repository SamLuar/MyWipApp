const CACHE_NAME = 'mywipapp-cache-v2';

const ASSETS_TO_CACHE = [
  './',
  './data/hours.json',
  './data/projects.json',
  './styles.css',
  './app.js',
  './index.html',
  './manifest.json'
];

// Instalação:
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação: limpar caches antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Pedidos:
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Intercepta a rota GET de API de projetos (ex: /api/projects ou /api/projects/:id)
  if (url.pathname.includes('/api/projects') && event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(event.request);
          if (networkRes.ok) return networkRes;
        } catch (_) {}

        try {
          const cachedResponse = await caches.match('./data/projects.json');
          const res = cachedResponse ? cachedResponse.clone() : await fetch(new URL('./data/projects.json', self.location.href));
          const projects = await res.json();

          const pathParts = url.pathname.split('/');
          const projectId = pathParts[pathParts.length - 1];

          if (projectId && projectId !== 'projects' && !isNaN(projectId)) {
            const project = projects.find((p) => p.id == projectId);
            return new Response(JSON.stringify(project || {}), {
              headers: { 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify(projects), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response('[]', {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })()
    );
    return;
  }

  // 2. Intercepta a rota GET de API de horas (ex: /api/hours ou /api/hours/:projectId)
  if (url.pathname.includes('/api/hours') && event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(event.request);
          if (networkRes.ok) return networkRes;
        } catch (_) {}

        try {
          const cachedResponse = await caches.match('./data/hours.json');
          const res = cachedResponse ? cachedResponse.clone() : await fetch(new URL('./data/hours.json', self.location.href));
          const hours = await res.json();
          const projectHours = [];

          const pathParts = url.pathname.split('/');
          const projectId = pathParts[pathParts.length - 1];

          for (const category in hours) {
            if (hours[category][projectId]) {
              projectHours.push(...hours[category][projectId]);
            }
          }

          return new Response(JSON.stringify(projectHours), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response('[]', {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })()
    );
    return;
  }

  // 3. Para todos os outros ficheiros: Cache First com Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
