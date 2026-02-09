import Navbar from "./navbar";
import Watchlist from "./watchlist.jsx";
import "./styles/landing-page.css";
import LineChart from "./Charts/lineChart.jsx";
export default function LandingPage() {
    return (
        <>
            <div className="page">
                <Navbar />
                <div className="Landing-Page">
                    <div className="content">
                        <div className="chart-area">NSEI<LineChart ticker="^NSEI" /></div>
                        <div className="chart-area">^GSPC<LineChart ticker="^GSPC" /></div>
                        <div className="chart-area">^N225<LineChart ticker="^N225" /></div>
                        <div className="chart-area">^DJI<LineChart ticker="^DJI" /></div>
                    </div>
                    <div className="watchlist">
                        <Watchlist/>
                    </div>
                    
                </div>
            </div>


        </>
    );
}