// TradeClaw Service Worker — PWA + Push Notifications + Offline
const CACHE_NAME = 'tradeclaw-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/screener',
  '/leaderboard',
  '/accuracy',
  '/paper-trading',
  '/backtest',
  '/explain',
  '/plugins',
  '/offline',
  '/manifest.json',
];

// ── Install: pre-cache static pages ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for pages, cache-first for static assets ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // SSE streams — never cache
  if (url.pathname.includes('/api/prices/stream') || url.pathname.includes('/api/stream/')) {
    return;
  }

  // API routes — network-first, return error JSON if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Static assets (JS/CSS/images) — cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?|ico)$/) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Pages — network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/offline') || new Response('Offline', { status: 503 });
        }
        return new Response('Not available offline', { status: 503 });
      })
  );
});

// ── Push notifications ──
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New trading signal',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'tradeclaw-signal',
      data: { url: data.url || '/dashboard' },
      actions: [
        { action: 'view', title: 'View Signal' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [100, 50, 100],
      requireInteraction: data.requireInteraction || false,
    };
    event.waitUntil(self.registration.showNotification(data.title || 'TradeClaw', options));
  } catch {
    // Ignore malformed push
  }
});

// ── Notification click ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ── Background sync (for signal alerts check) ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-alerts') {
    event.waitUntil(
      fetch('/api/alerts/check', { method: 'POST' }).catch(() => { /* best effort */ })
    );
  }
});
