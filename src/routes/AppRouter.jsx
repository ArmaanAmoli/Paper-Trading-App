import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login.jsx";
import Signup from "../pages/signup.jsx";
import LandingPage from "../pages/landingPage.jsx";
import ProtectedRoutes from "./protectedRoutes.jsx";
import StockMainChart from "../pages/stockChart.jsx";
import PortfolioPage from "../pages/portfolioPage.jsx";
import UserProfile from "../pages/userProfile.jsx";

const AppRouter = () => {
    return (

        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* Protected routes wrapped inside the parent route */}
            <Route element={<ProtectedRoutes />}>
                <Route path="/landing-page" element={<LandingPage />} />
                <Route path="/chart/:ticker" element={<StockMainChart/>}/>
                <Route path="/userPortfolio" element={<PortfolioPage/>}/>
                <Route path="/userprofile" element={<UserProfile/>}/>
            </Route>

        </Routes>

    )
}
export default AppRouter