// Firebase Messaging Service Worker for Cobb Phone Link (cobb-store.web.app)
// This service worker handles background FCM push notifications (even when browser tab is closed)
/* eslint-disable no-undef */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase config must match the project — these are not secrets (client-side public config)
firebase.initializeApp({
  apiKey: 'AIzaSyDabxrr3v81IWbRI-u27a2bUa5DOGmDu78',
  authDomain: 'cobb-store.firebaseapp.com',
  projectId: 'cobb-store',
  storageBucket: 'cobb-store.firebasestorage.app',
  messagingSenderId: '1010797128815',
  appId: '1:1010797128815:web:2adc68eef43a09d004719a'
});

const messaging = firebase.messaging();

// Handle background FCM messages — this fires when the tab is in background / closed
messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || '🧾 New Sale Recorded';
  const body = notif.body || data.body || 'A new checkout was made at Cobb.';
  const billNumber = data.billNumber || '';
  const billId = data.billId || '';
  const targetUrl = data.url || (billNumber ? `/?tab=livebills&bill=${encodeURIComponent(billNumber)}` : '/?tab=livebills');

  self.registration.showNotification(title, {
    body,
    icon: '/ors-logo.png',
    badge: '/ors-logo.png',
    silent: true,
    tag: `cobb-sale-${billNumber || Date.now()}`,
    renotify: true,
    data: {
      url: targetUrl,
      billNumber,
      billId,
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open_bill', title: 'View Bill 🔍' }
    ]
  });
});

// Deep-link to the specific bill when user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const customData = event.notification.data || {};
  const relativeUrl = customData.url || '/?tab=livebills';
  const destinationUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If Cobb tab is already open, navigate it and bring to focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) client.navigate(destinationUrl);
          return client.focus();
        }
      }
      // Otherwise open a fresh window at the bill deep-link
      if (clients.openWindow) return clients.openWindow(destinationUrl);
    })
  );
});
