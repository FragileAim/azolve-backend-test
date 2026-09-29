self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data?.type === 'show-notification') {
    showNotification(data);
  }
});

function showNotification(data) {
  const title = data.title || 'Notification';
  const message = data.message || '';
  const url = data.url || '/';

  self.registration.showNotification(title, {
    body: message,
    icon: '/favicon.ico',
    data: { url },
    badge: '/assets/favicon-32.png',
    vibrate: [100, 50, 100],
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === notificationUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(notificationUrl);
      }
    })
  );
});
