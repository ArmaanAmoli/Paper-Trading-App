import Navbar from "../Components/navbar.jsx";
import Watchlist from "../Components/watchlist.jsx";
import Market from "./market.jsx";
import LineChart from "../Components/Charts/lineChart.jsx";
export default function LandingPage() {
    return (
        <div className="h-screen flex flex-col p-1 overflow-hidden ">
            <div className="w-99/100 sticky top-0 border-2 border-white/25 mt-1 rounded-3xl px-8 py-1"><Navbar/></div>
            
            <div className="w-full flex-1 min-h-0 grid grid-cols-20 overflow-hidden">
                <div className="col-span-15 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
                    <Market/>
                </div>
                <div className="col-span-5 h-full min-h-0 overflow-hidden border-l border-white/20 ">
                    <Watchlist />
                </div>

            </div>
        </div>
    );
}