// Service Worker for Luxes PWA

const CACHE_NAME = 'luxes-static-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/LogoBanner.png',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // APIs: network only with JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Sin conexión con el servidor' },
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // SPA navigation: network first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) return response;
          return caches.match('/index.html');
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Vite dev assets and static files: network first (avoid stale HMR modules)
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // SPA client routes (e.g. /clientes): always serve index.html
  const isSpaRoute =
    !url.pathname.startsWith('/api/') &&
    !url.pathname.includes('.') &&
    url.pathname !== '/';

  if (isSpaRoute) {
    event.respondWith(
      fetch(event.request)
        .then((response) => (response.ok ? response : caches.match('/index.html')))
        .catch(() => caches.match('/index.html'))
        .then((response) => response || new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Other static assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return (cached || networkFetch).then(
        (response) => response || caches.match('/index.html')
      );
    })
  );
});

// Handle Push Events
self.addEventListener('push', (event) => {
  let data = { title: 'Luxes Portal', body: 'Nueva notificación recibida.' };
  try {
    data = event.data ? event.data.json() : data;
  } catch (err) {
    if (event.data) {
      data = { title: 'Luxes Portal', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: [100, 50, 100],
    data: data.data || {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.navigate(targetUrl).then((c) => c.focus());
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
