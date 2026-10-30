import { Outlet, Navigate } from 'react-router-dom';
import isTokenExpired from './checkTokenExpiry';
export default function ProtectedRoutes() {
  const token = localStorage.getItem('token');
  return !token || isTokenExpired(token) ? <Navigate to="/" replace /> : <Outlet />;
}
