import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { fetchUserData } from '../services/api';

type SessionStatus = 'checking' | 'authenticated' | 'unauthenticated';

export default function ProtectedRoutes() {
  const [status, setStatus] = useState<SessionStatus>('checking');

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        await fetchUserData();
        if (active) setStatus('authenticated');
      } catch {
        if (active) setStatus('unauthenticated');
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return <div className="auth-loading">Checking session…</div>;
  }

  return status === 'authenticated' ? <Outlet /> : <Navigate to="/" replace />;
}
