importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCIUR5jZPuH_EgpT9DrPrPdpxLNq3MeQuE',
  authDomain: 'randomapplication-e14d2.firebaseapp.com',
  databaseURL: 'https://randomapplication-e14d2.firebaseio.com',
  projectId: 'randomapplication-e14d2',
  storageBucket: 'randomapplication-e14d2.firebasestorage.app',
  messagingSenderId: '288405823844',
  appId: '1:288405823844:web:2979e73e813c947dad9a71',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const eventName = payload.data?.event || 'notices';
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'greenox-push', event: eventName }));
  });
  const title = payload.notification?.title || payload.data?.title || '';
  const body = payload.notification?.body || payload.data?.body || '';
  if (title && body) self.registration.showNotification(title, { body });
});
