import Navbar from "../Components/navbar.jsx";
import Watchlist from "../Components/watchlist.jsx";
import Market from "./market.jsx";
import LineChart from "../Components/Charts/lineChart.jsx";
export default function LandingPage() {
    return (
        <div className="h-screen flex flex-col p-1 overflow-hidden ">
            <div className="w-full sticky top-0 bg-black/50 z-10 backdrop-blur-3xl"><Navbar/></div>
            
            <div className="w-full flex-1 min-h-0 grid grid-cols-20 overflow-hidden scrollbar-thin">
                <div className="col-span-15 h-full min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
                    {/* <div className="w-full h-[400px]">NSEI<LineChart ticker="^NSEI" /></div>
                    <div className="w-full h-[400px]">^GSPC<LineChart ticker="^GSPC" /></div>
                    <div className="w-full h-[400px]">^N225<LineChart ticker="^N225" /></div>
                    <div className="w-full h-[400px]">^DJI<LineChart ticker="^DJI" /></div> */}
                    <Market/>
                </div>
                <div className="col-span-5 h-full min-h-0 overflow-hidden border-l border-white/20 ">
                    <Watchlist />
                </div>

            </div>
        </div>
    );
}