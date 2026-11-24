import { api } from './api.js';
import { getToken, messagingOrNull, onMessage } from './firebase.js';

const PUSH = 'greenoxhr.webPushToken';
let workerBridgeReady = false;
let foregroundListenerReady = false;

function bridgeServiceWorker() {
  if (workerBridgeReady || !navigator.serviceWorker) return;
  workerBridgeReady = true;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'greenox-push') return;
    window.dispatchEvent(new CustomEvent('greenox-push', {
      detail: { event: event.data.event || 'notices' },
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
  localStorage.setItem(PUSH, token);
  await api('/api/v1/devices', { method: 'POST', body: { platform: 'web', token } });
  if (!foregroundListenerReady) {
    foregroundListenerReady = true;
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || '';
      const body = payload.notification?.body || payload.data?.body || '';
      if (title && body) registration.showNotification(title, { body });
      window.dispatchEvent(new CustomEvent('greenox-push', {
        detail: { event: payload.data?.event || 'notices' },
      }));
    });
  }
  bridgeServiceWorker();
}

export async function disableWebPush() {
  const token = localStorage.getItem(PUSH);
  if (!token) return;
  try {
    await api('/api/v1/devices', { method: 'DELETE', body: { token } });
  } finally {
    localStorage.removeItem(PUSH);
  }
}
