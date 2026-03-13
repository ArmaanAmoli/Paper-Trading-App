import Ticker from "./ticker.jsx";
import "./styles/watchlist.css";
export default function Watchlist() {
    return (
        <div className="stock-list">
            <div className="py-10px flex flex-row justify-between w-full">
                <h4>Watchlist</h4>
                <button className="pb-10 w-[30px] h-[30px] border-1 flex justify-center items-center rounded-full text-xl hover:bg-[#666666]">+</button>
            </div>

            <div className="heading-wl">
                <p>Symbol</p>
                <p>Price</p>
                <p>Change</p>
                <p>%Change</p>
            </div>

            <Ticker name="RR.L" />
            <Ticker name="^FTSE" />
            <Ticker name="LLY" />
        </div>
    );
}