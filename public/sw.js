
const CACHE_NAME = 'cyberphone-cache-v10';
const urlsToCache = [
  '/',
  '/index.html?v=100'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Ignorar requisições do Chrome Extension para evitar erros de console
  if (event.request.url.startsWith('chrome-extension://')) return;

  // Ignorar requisições para domínios do Google/Firebase para evitar problemas de conectividade (Firestore Offline)
  if (event.request.url.includes('googleapis.com') || event.request.url.includes('firebase.io')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request, { 
        credentials: event.request.mode === 'navigate' ? 'include' : 'same-origin' 
      }).then(networkResponse => {
        // Cache apenas se for sucesso e não for uma API externa que possa falhar (como supabase placeholder)
        if (networkResponse.ok && event.request.url.startsWith(self.location.origin)) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch((err) => {
        // If we have a cached response, use it
        if (cachedResponse) return cachedResponse;
        
        // Se for navegação e falhar, retornar index.html (SPA Fallback)
        if (event.request.mode === 'navigate') {
            return cache.match('/index.html');
        }

        // Return a custom error response or null to avoid "Failed to fetch" breaking app logic violently
        // Returning undefined here makes the browser throw "Failed to fetch", which is caught by app logic usually
        // But logging it might help debugging
        // console.warn('Fetch failed for:', event.request.url);
        throw err;
      });

      // Retorna cache primeiro se existir (Stale-While-Revalidate)
      return cachedResponse || fetchPromise;
    })
  );
});

// --- LÓGICA DE PUSH NOTIFICATIONS ---

self.addEventListener('push', (event) => {
  let data = { title: 'CyBerPhone', body: 'Nova interação detectada!', icon: '/icon-192x192.png' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ver Agora' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já houver uma aba aberta, foca nela e navega
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
