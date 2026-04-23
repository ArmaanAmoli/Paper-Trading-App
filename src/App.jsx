import { useEffect } from 'react';
import './App.css';
import AppRouter from './routes/AppRouter.jsx';
import { wsManager } from './lib/wsManager.js';
// import { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';

function App() {
  useEffect(() => {
    wsManager.connect("prices", "ws://localhost:8000/ws/prices");
    return ()=>{
      wsManager.disconnect("prices");
    }
  }, [])
  return <AppRouter />
}

export default App;
