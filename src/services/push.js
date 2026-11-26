import { API, EVENTS, PLATFORM, PUSH_PAYLOAD, STORAGE } from '../constants/index.js';
import { api } from '../shared/api/client.js';
import { getToken, messagingOrNull, onMessage } from './firebase.js';

let workerBridgeReady = false;
let foregroundListenerReady = false;

function bridgeServiceWorker() {
  if (workerBridgeReady || !navigator.serviceWorker) return;
  workerBridgeReady = true;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== EVENTS.push) return;
    window.dispatchEvent(new CustomEvent(EVENTS.push, {
      detail: { event: event.data.event || PUSH_PAYLOAD.notices },
    }));
  });
}

export async function enableWebPush() {
  const messaging = messagingOrNull();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!messaging || !vapidKey) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return;
  localStorage.setItem(STORAGE.webPushToken, token);
  await api(API.devices, { method: 'POST', body: { platform: PLATFORM.web, token } });
  if (!foregroundListenerReady) {
    foregroundListenerReady = true;
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || '';
      const body = payload.notification?.body || payload.data?.body || '';
      if (title && body) registration.showNotification(title, { body });
      window.dispatchEvent(new CustomEvent(EVENTS.push, {
        detail: { event: payload.data?.event || PUSH_PAYLOAD.notices },
      }));
    });
  }
  bridgeServiceWorker();
}

export async function disableWebPush() {
  const token = localStorage.getItem(STORAGE.webPushToken);
  if (!token) return;
  try {
    await api(API.devices, { method: 'DELETE', body: { token } });
  } finally {
    localStorage.removeItem(STORAGE.webPushToken);
  }
}
