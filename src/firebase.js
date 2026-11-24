import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyCIUR5jZPuH_EgpT9DrPrPdpxLNq3MeQuE',
  authDomain: 'randomapplication-e14d2.firebaseapp.com',
  databaseURL: 'https://randomapplication-e14d2.firebaseio.com',
  projectId: 'randomapplication-e14d2',
  storageBucket: 'randomapplication-e14d2.firebasestorage.app',
  messagingSenderId: '288405823844',
  appId: '1:288405823844:web:2979e73e813c947dad9a71',
};

export const firebaseApp = initializeApp(firebaseConfig);

export function messagingOrNull() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;
  return getMessaging(firebaseApp);
}

export { getToken, onMessage };
