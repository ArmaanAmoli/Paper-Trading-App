import Navbar from "../Components/navbar.jsx";
import Watchlist from "../Components/watchlist.jsx";
import Market from "./market.jsx";
import LineChart from "../Components/Charts/lineChart.jsx";
export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col overflow-hidden">
            <Navbar />
            
            <main className="flex-1 min-h-0 w-full max-w-screen-2xl mx-auto px-4 pb-8 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full min-h-0">
                    <div className="lg:col-span-3 min-h-0 flex flex-col">
                        <Market />
                    </div>
                    <div className="lg:col-span-1 h-full min-h-0">
                        <Watchlist />
                    </div>
                </div>
            </main>
        </div>
    );
}