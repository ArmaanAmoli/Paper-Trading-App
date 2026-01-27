import { Outlet, Navigate } from "react-router-dom";

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const token = localStorage.getItem("token");

const ProtectedRoutes = () =>{
    return (!token || isTokenExpired(token)) ? <Navigate to="/" replace />:<Outlet/>;
}

export default ProtectedRoutes;
