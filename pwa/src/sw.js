importScripts('ngsw-worker.js'); // import il service worker creato in automatico per lasciare a lui la gestione delle cache, dato che sono ottimizzate

const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  console.log('Custom Service Worker: Install');
  event.waitUntil(
    caches.open('custom-offline-cache').then((cache) => {
      return cache.addAll(['/offline.html']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Custom Service Worker: Activate');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    if(event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Se offline e la route non è in cache, mostra offline.html
                    return caches.match('/offline.html');
                })
        );
    }
});

self.addEventListener('push', (event) => {
  let data = { title: 'Notifica', body: '', url: '/' };
  try {
    if (event.data) data = event.data.json();
  } catch (err) {
    // event.data potrebbe essere testo
    data.body = event.data ? event.data.text() : data.body;
  }

  const title = data.title || 'Notifica';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/icon/logo.png',
    badge: data.badge || '/assets/icon/logo.png',
    data: {
      url: data.url || '/',
      ...data
    },
    actions: data.actions || [] // es. [{action:'open', title:'Apri'}]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const urlToOpen = payload.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // prova a riusare una finestra esistente
      for (const client of clientList) {
        if ('focus' in client) {
          // se l'url è già aperto, portaci il focus
          if (client.url === urlToOpen || client.url.includes(urlToOpen)) {
            return client.focus();
          }
        }
      }
      // altrimenti apri una nuova finestra
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});