import { useEffect, useLayoutEffect } from 'react';
import { wsManager } from './lib/wsManager';
import { AUTH_SESSION_STARTED_EVENT } from './lib/authEvents';
import api, { fetchUserData } from './services/api';
import { fetchWsTicket } from './services/auth';
import AppRouter from './routes/AppRouter';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Run `callback` once the visitor has an authenticated session: immediately
 * when the session check succeeds, otherwise when the login page fires
 * `auth:session-started` after a login or session restore. Returns a cleanup
 * function. Keeps logged-out tabs from touching authenticated endpoints.
 */
function whenAuthenticated(callback: () => void): () => void {
  let cancelled = false;

  const onSessionStarted = () => {
    if (!cancelled) callback();
  };

  void fetchUserData()
    .then(() => {
      if (!cancelled) callback();
    })
    .catch(() => {
      if (!cancelled) {
        window.addEventListener(AUTH_SESSION_STARTED_EVENT, onSessionStarted, { once: true });
      }
    });

  return () => {
    cancelled = true;
    window.removeEventListener(AUTH_SESSION_STARTED_EVENT, onSessionStarted);
  };
}

export function App() {
  // Push subscription sync — authenticated sessions only (save-subscription
  // is a protected endpoint).
  useEffect(() => {
    const syncSubscription = async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

      try {
        const reg = await navigator.serviceWorker.ready;
        let subscription = await reg.pushManager.getSubscription();
        // If no subscription exist create an new one
        if (!subscription) {
          const convertedVapidKey = urlBase64ToUint8Array(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY);
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });

          // brand new subscription send to backend
          console.log('New subscription created, sending to backend...');
          await api.post('/save-subscription', { data: subscription });
          return;
        }

        // Check LocalStorage to see if we already synced this specific subscription
        const lastSyncedSub = localStorage.getItem('last_synced_subscription');
        const currentSubString = JSON.stringify(subscription);

        if (lastSyncedSub !== currentSubString) {
          console.log('Subscription changed or unsynced, updating backend...');
          await api.post('/save-subscription', { data: subscription });
          // Save to local storage so we don't send it again next time
          localStorage.setItem('last_synced_subscription', currentSubString);
        } else {
          console.log('Subscription is already up-to-date on the backend.');
        }
      } catch (error) {
        console.error('Error syncing push subscription: ', error);
      }
    };

    const requestAndSync = () => {
      if (Notification.permission === 'granted') {
        void syncSubscription();
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission().then((permission) => {
          if (permission === 'granted') void syncSubscription();
        });
      }
    };

    return whenAuthenticated(requestAndSync);
  }, []);

  //code to connect to websockets data feed — authenticated sessions only:
  // a logged-out tab must not poll /auth/ws-ticket. The feeds connect when
  // the session check succeeds, or when the login page fires
  // `auth:session-started` after a login / session restore.
  useLayoutEffect(() => {
    return whenAuthenticated(() => {
      try {
        // The WS server authenticates via a short-lived ticket JWT passed as
        // a subprotocol (the session cookie is HttpOnly and cannot be read by
        // JS). getToken fetches a fresh ticket on every (re)connect;
        // reconnectDelay stays under the 30 req/min auth rate limit (2 feeds).
        wsManager.connect('quote', 'ws://127.0.0.1:8001/ws/quote', {
          reconnectDelay: 5000,
          getToken: fetchWsTicket,
        });
        wsManager.connect('indicator', 'ws://127.0.0.1:8001/ws/indicator', {
          reconnectDelay: 5000,
          getToken: fetchWsTicket,
        });
      } catch (error) {
        console.warn('WebSocket connection failed (backend may not be running):', error);
      }
    });
  }, []);

  return (
    <>
      <AppRouter />
    </>
  );
}

export default App;
