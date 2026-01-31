import Navbar from "./navbar";
import "./styles/landing-page.css";
import LineChart from "./Charts/lineChart.jsx";
export default function LandingPage() {
    return (
        <>
            <div className="Landing-Page">
                <Navbar />
                <div className="below-nav">
                    <div className="content">
                        <div className="TOP-4-CHARTS">
                            <div className="C1">
                                <div><LineChart ticker="^NSEI" /></div>
                                <div><LineChart ticker="^GSPC" /></div>
                            </div>
                            <div className="C2">
                                <div><LineChart ticker="^N225" /></div>
                                <div><LineChart ticker="^DJI" /></div>
                            </div>
                        </div>

                    </div>

                    <div className="stock-list">

                    </div>
                </div>


            </div>

        </>
    );
}