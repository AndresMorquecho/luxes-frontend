// Service Worker for Luxes PWA

const CACHE_NAME = 'luxes-static-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/LogoGlobo.png',
  '/LogoBanner.png',
  '/favicon.svg'
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

// Fetch Event: network first for pages and APIs, falling back to cache
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip APIs to keep dynamic content fresh, or use network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Serve static assets or fallback
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});

// Handle Push Events
self.addEventListener('push', (event) => {
  let data = { title: 'Luxes Portal', body: 'Nueva notificación recibida.' };
  try {
    data = event.data ? event.data.json() : data;
  } catch (err) {
    // If payload is plain text instead of json
    if (event.data) {
      data = { title: 'Luxes Portal', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/LogoGlobo.png',
    badge: data.badge || '/LogoGlobo.png',
    vibrate: [100, 50, 100],
    data: data.data || {
      url: data.url || '/'
    }
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
        // Check if there is already a window open with the same app, navigate or focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.navigate(targetUrl).then((c) => c.focus());
          }
        }
        // If no windows are open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
