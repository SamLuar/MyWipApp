const CACHE_NAME = 'mywipapp-cache-v1';

const ASSETS_TO_CACHE = [
  './',
  './data/hours.json',
  './data/projects.json',
  './styles.css',
  './app.js',
  './index.html',
  './manifest.json'
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
  const url = new URL(event.request.url);

  // 1. Intercepta a rota de API de projetos (ex: api/project/1 ou api/projects)
  if (url.pathname.includes('/api/projects')) {
    event.respondWith(
      caches.match('./data/projects.json').then(async (response) => {
        // Se não estiver em cache, procura no servidor estático
        const res = response || await fetch('./data/projects.json');
        const projects = await res.json();

        // Extrai o ID do URL se existir (ex: /api/project/123)
        const pathParts = url.pathname.split('/');
        const projectId = pathParts[pathParts.length - 1];

        // Se o último segmento for um número/ID, filtra o projeto específico
        if (projectId && !isNaN(projectId)) {
          const project = projects.find((p) => p.id == projectId);
          return new Response(JSON.stringify(project || {}), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Se for uma busca geral (/api/projects), devolve a lista completa
        return new Response(JSON.stringify(projects), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // 2. Intercepta a rota de API de horas (ex: api/hours)
  if (url.pathname.includes('/api/hours')) {
    event.respondWith(
      caches.match('./data/hours.json').then(async (response) => {
        const res = response || await fetch('./data/hours.json');
        const hours = await res.json();
        const projectHours = [];

        // Extrai o ID do URL se existir (ex: /api/hours/123)
        const pathParts = url.pathname.split('/');
        const projectId = pathParts[pathParts.length - 1];
        
        for (const category in hours) {
          if (hours[category][projectId]) {
            projectHours.push(...hours[category][projectId]);
          }
        }
        res.json(projectHours);
      })
    );
    return;
  }

  // 3. Para todos os outros ficheiros (HTML, CSS, JS, Imagens)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
            return cachedResponse;
        }
        return fetch(event.request);
    })
  );
});
