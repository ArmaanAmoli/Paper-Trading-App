import { useEffect, useLayoutEffect, useRef } from 'react';
import './App.css';
import AppRouter from './routes/AppRouter.jsx';
import { wsManager } from './lib/wsManager.js';
import api from './services/api.js';
// import { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

function App() {


  useEffect(() => {
    console.log("notification effect fired")
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications.');
      return;
    }
    if (Notification.permission === "default") {
      Notification.requestPermission().then(async (permission) => {
        console.log('Permission result:', permission);

        if (permission === "granted") {
          new Notification('Paper Trading App: Notification enabled');

          const reg = await navigator.serviceWorker.ready;
          const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: import.meta.env.WEB_PUSH_PUBLIC_KEY
          });

          console.log("Subscription object --> ", subscription);

          const res = await api.post('/save-subscription', { data: subscription })
          console.log("response----------->",res)

        } else {
          console.log('User permission not granted');
        }
      });
    }

  }, [])
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
