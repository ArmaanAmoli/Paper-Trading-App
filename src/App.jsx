import { useEffect, useLayoutEffect } from 'react';
import './App.css';
import AppRouter from './routes/AppRouter.jsx';
import { wsManager } from './lib/wsManager.js';
// import { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

function App() {
  useLayoutEffect(() => {
    wsManager.connect("quote", "ws://127.0.0.1:8001/ws/quote");
    wsManager.connect("indicator", "ws://127.0.0.1:8001/ws/indicator");
    return ()=>{
      wsManager.disconnect("quote");
      wsManager.disconnect("indicator");
    }
  }, [])
  return <AppRouter />
}

export default App;
