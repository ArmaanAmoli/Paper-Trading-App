import Ticker from "./ticker.jsx";
import "./styles/watchlist.css";
export default function Watchlist() {
    return (
        <div className="stock-list">
            <h4>Watchlist</h4>
            <div className="heading-wl">
                <p>Symbol</p>
                <p>Price</p>
                <p>Change</p>
                <p>%Change</p>
            </div>

            <Ticker name="RR.L"/>
            <Ticker name="^FTSE"/>
            <Ticker name="LLY"/>
        </div>
    );
}