// Service Worker for Luxes PWA

const CACHE_NAME = 'luxes-static-cache-v7';

function isAssetResponse(url, response) {
  if (!response || !response.ok) return false;
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (url.pathname.endsWith('.js')) {
    return type.includes('javascript') || type.includes('ecmascript');
  }
  if (url.pathname.endsWith('.css')) {
    return type.includes('css');
  }
  return true;
}

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/LogoBanner.png',
];

function offlineJson() {
  return new Response(
    JSON.stringify({
      success: false,
      error: { message: 'Sin conexión con el servidor' },
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

function offlineHtml() {
  return caches.match('/index.html').then(
    (cached) => cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  );
}

/** Network first; guarda en caché si la respuesta es OK. */
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

/** Sirve caché al instante y actualiza en segundo plano. */
function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const networkPromise = networkFirst(request).catch(() => undefined);
    if (cached) {
      networkPromise.catch(() => {});
      return cached;
    }
    return networkPromise.then((response) => response || caches.match('/index.html'));
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // APIs y subidas de archivos (/uploads, /api): dejar que el navegador los maneje de forma nativa sin pasar por el SW.
  // Al no llamar a event.respondWith, el navegador usa su pipeline de red nativo + aceleración GPU.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    return;
  }

  // Navegación SPA
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => (response.ok ? response : offlineHtml()))
        .catch(() => offlineHtml())
    );
    return;
  }

  // Dev (Vite HMR)
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Rutas SPA sin extensión (/clientes, /usuarios, etc.)
  const isSpaRoute =
    !url.pathname.includes('.') &&
    url.pathname !== '/';

  if (isSpaRoute) {
    event.respondWith(
      fetch(event.request)
        .then((response) => (response.ok ? response : offlineHtml()))
        .catch(() => offlineHtml())
    );
    return;
  }

  // JS/CSS con hash de Vite: red primero; rechazar HTML disfrazado de bundle
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!isAssetResponse(url, response)) {
            return new Response('Asset not found', { status: 404 });
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
        .then((response) => {
          if (response && isAssetResponse(url, response)) return response;
          return new Response('Asset not found', { status: 404 });
        })
    );
    return;
  }

  // Resto de estáticos (favicon, manifest, imágenes)
  event.respondWith(
    staleWhileRevalidate(event.request).then(
      (response) => response || offlineHtml()
    )
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Luxes Portal', body: 'Nueva notificación recibida.' };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    if (event.data) {
      data = { title: 'Luxes Portal', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: [100, 50, 100],
    data: data.data || { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

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
