const CACHE_NAME = 'ors-retail-cache-v2';
const ASSETS_TO_CACHE = [
  '/ors-logo.png',
  '/ors-squircle.jpg',
  '/favicon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ORS Service Worker] Pre-caching core shell assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ORS Service Worker] Removing old cache version:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude API requests, ngrok tunnels, or Cloudflare streams from cache
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('ngrok') ||
    url.hostname.includes('trycloudflare') ||
    url.hostname.includes('firestore.googleapis.com') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages): ALWAYS Network-First so users get latest updates instantly!
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 2. Static hashed assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// --- Checkout Web Push Notification Handler ---
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        notification: {
          title: '🧾 New Sale Alert',
          body: event.data.text()
        }
      };
    }
  }

  const notificationData = payload.notification || {};
  const customData = payload.data || {};

  const title = notificationData.title || customData.title || '🧾 New Sale Recorded';
  const body = notificationData.body || customData.body || 'A new checkout was made.';
  const billNumber = customData.billNumber || '';
  const billId = customData.billId || '';
  const targetUrl = customData.url || (billNumber ? `/?tab=livebills&bill=${encodeURIComponent(billNumber)}` : '/?tab=livebills');

  const options = {
    body: body,
    icon: notificationData.icon || '/ors-logo.png',
    badge: '/ors-logo.png',
    silent: false,
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    tag: `cobb-sale-${billNumber || Date.now()}`,
    renotify: true,
    data: {
      url: targetUrl,
      billNumber: billNumber,
      billId: billId,
      dateOfArrival: Date.now()
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Deep link to bill breakdown on notification tap
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const customData = event.notification.data || {};
  const relativeUrl = customData.url || '/?tab=livebills';
  const destinationUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(destinationUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(destinationUrl);
      }
    })
  );
});

