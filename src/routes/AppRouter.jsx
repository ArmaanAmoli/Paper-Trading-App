import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login.jsx";
import Signup from "../pages/signup.jsx";
import LandingPage from "../pages/landingPage.jsx";
import ProtectedRoutes from "./protectedRoutes.jsx";

const AppRouter = () => {
    return (

        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* Protected routes wrapped inside the parent route */}
            <Route element={<ProtectedRoutes />}>
                <Route path="/landing-page" element={<LandingPage />} />
            </Route>

        </Routes>

    )
}
export default AppRouter