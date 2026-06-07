import { useEffect, useLayoutEffect, useRef } from 'react';
import './App.css';
import AppRouter from './routes/AppRouter.jsx';
import { wsManager } from './lib/wsManager.js';
import api from './services/api.js';
// import { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function App() {

  useEffect(() => {

    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;


    const syncSubscription = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        let subscription = await reg.pushManager.getSubscription();
        // If no subscription exist create an new one
        if (!subscription) {
          const convertedVapidKey = urlBase64ToUint8Array(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY);
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });

          // brand new subscription send to backend
          console.log("New subscription created, sending to backend...");
          await api.post('/save-subscription', { data: subscription });
          return;
        }

        // 4. Check LocalStorage to see if we already synced this specific subscription
        const lastSyncedSub = localStorage.getItem('last_synced_subscription');
        const currentSubString = JSON.stringify(subscription);

        if (lastSyncedSub !== currentSubString) {
          console.log("Subscription changed or unsynced, updating backend...");
          await api.post('/save-subscription', { data: subscription });
          // Save to local storage so we don't send it again next time
          localStorage.setItem('last_synced_subscription', currentSubString);
        } else {
          console.log("Subscription is already up-to-date on the backend.");
        }


      } catch (error) {
        console.error("Error syncing push subscription: ", error);
      }
    }

    // Only run if permission is granted
    if(Notification.permission === "granted"){
      syncSubscription();
    }
    else if(Notification.permission === "default"){
      Notification.requestPermission().then((permission)=>{
        if(permission === "granted")syncSubscription();
      });
    }
  },[]);

  //code to connect to websockets data feed
  useLayoutEffect(() => {
    wsManager.connect("quote", "ws://127.0.0.1:8001/ws/quote");
    wsManager.connect("indicator", "ws://127.0.0.1:8001/ws/indicator");
    return () => {
      wsManager.disconnect("quote");
      wsManager.disconnect("indicator");
    }
  }, [])


  return <>
    <AppRouter />
  </>
}

export default App;
