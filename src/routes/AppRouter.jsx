import { Routes, Route, Outlet } from "react-router-dom";
import Login from "../pages/login.jsx";
import Signup from "../pages/signup.jsx";
import LandingPage from "../pages/landingPage.jsx";
import ProtectedRoutes from "./protectedRoutes.jsx";
import StockMainChart from "../pages/stockChart.jsx";
import PortfolioPage from "../pages/portfolioPage.jsx";
import UserProfile from "../pages/userProfile.jsx";
import { WatchlistProvider, UserEquityProvider, UserAccountProvider, IndicatorsListProvider } from "../Context/context.jsx";
import MarketDataProvider from "../Context/MarketPageContextProvider.jsx";
import Navbar from "../Components/Navbar.jsx";


const AuthenticatedProviders = () => {
    return (
        <UserAccountProvider>
            <UserEquityProvider>
                <MarketDataProvider>
                    <WatchlistProvider>
                        <IndicatorsListProvider>
                            <div style={{ height: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Outlet />
                            </div>
                        </IndicatorsListProvider>
                    </WatchlistProvider>
                </MarketDataProvider>
            </UserEquityProvider>
        </UserAccountProvider>
    );
};

const AppLayout = () => {
    return (
        <div style={{ height: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <Outlet />
        </div>
    );
};

const AppRouter = () => {
    return (
        <div style={{ height: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                {/* Protected routes wrapped inside the parent route */}
                <Route element={<ProtectedRoutes />}> 
                    <Route element={<AuthenticatedProviders />}> 
                        <Route element={<AppLayout />}> 
                            <Route path="/landing-page" element={<LandingPage />} />
                            <Route path="/chart/:ticker" element={<StockMainChart />} />
                            <Route path="/userPortfolio" element={<PortfolioPage />} />
                            <Route path="/userprofile" element={<UserProfile />} />
                        </Route> 
                    </Route> 
                </Route> 
            </Routes> 
        </div> 
    );
}
export default AppRouter;