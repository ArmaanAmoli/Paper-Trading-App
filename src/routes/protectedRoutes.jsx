import { Outlet, Navigate } from "react-router-dom";
import isTokenExpired from "./checkTokenExpiry.js";
const ProtectedRoutes = () =>{
    const token = localStorage.getItem("token");
    return (!token || isTokenExpired(token)) ? <Navigate to="/" replace />:<Outlet/>;
}

export default ProtectedRoutes;
