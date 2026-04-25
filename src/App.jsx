import { useEffect } from 'react';
import './App.css';
import AppRouter from './routes/AppRouter.jsx';
import { wsManager } from './lib/wsManager.js';
// import { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

function App() {
  useEffect(() => {
    wsManager.connect("quote", "ws://127.0.0.1:8001/ws/quote");
    return ()=>{
      wsManager.disconnect("quote");
    }
  }, [])
  return <AppRouter />
}

export default App;
