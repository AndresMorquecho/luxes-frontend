// Service Worker for Luxes PWA

const CACHE_NAME = 'luxes-static-cache-v101';

function resolvePushTargetUrl(data, body, title) {
  const combined = `${body || ''} ${title || ''}`;
  const fromData = data?.url || (data?.proyectoId ? `/proyectos/${data.proyectoId}` : null);
  if (fromData && fromData !== '/') return fromData.split('?')[0];

  const navMatch = combined.match(/\[NAV:(\/[^\]\s?]+)/i);
  if (navMatch?.[1]) return navMatch[1].split('?')[0];

  const idFromTag = combined.match(/\[PROYECTO_ID:([^\]]+)\]/i)?.[1]?.trim();
  if (idFromTag) return `/proyectos/${idFromTag.toUpperCase()}`;

  const idFromParens = combined.match(/\(PROY-\d+\)/i)?.[0]?.replace(/[()]/g, '');
  if (idFromParens) return `/proyectos/${idFromParens.toUpperCase()}`;

  const idBare = combined.match(/PROY-\d+/i)?.[0];
  if (idBare) return `/proyectos/${idBare.toUpperCase()}`;

  return '/notificaciones';
}

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
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    return;
  }

  // Dev (Vite HMR)
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // Navegación SPA y rutas dinámicas (/proyectos/PROY-003, /clientes, etc.):
  // Servir SIEMPRE /index.html para evitar 404 del servidor y net::ERR_CACHE_MISS
  const isSpaRoute = !url.pathname.includes('.') && url.pathname !== '/';
  if (event.request.mode === 'navigate' || isSpaRoute) {
    event.respondWith(
      fetch('/index.html')
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
            return res;
          }
          return caches.match('/index.html');
        })
        .catch(() => caches.match('/index.html'))
        .then((res) => res || fetch(event.request))
    );
    return;
  }

  // JS/CSS con hash de Vite: red primero
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
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
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

  const targetUrl = resolvePushTargetUrl(data.data, data.body, data.title);
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: [100, 50, 100],
    data: { ...(data.data || {}), url: targetUrl },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client && 'navigate' in client) {
            return client.focus().then((c) => c.navigate(targetUrl));
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
