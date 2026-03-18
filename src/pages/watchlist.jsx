import Ticker from "./ticker.jsx";
import "./styles/watchlist.css";
import { useState } from "react";
import SearchTabPopUp from "./floatingSearchTab.jsx";
import { createPortal } from "react-dom";
export default function Watchlist() {
    const [searchTabOpen, setSearchTabOpen] = useState(false)

    const toggleSearchTab = () => {
        setSearchTabOpen(prev => !prev)
    }
    return (
        <div >
            {
                searchTabOpen && (createPortal(<SearchTabPopUp close={toggleSearchTab}/> , document.body))
            }
            <div className="stock-list">
                <div className="py-2.5 flex flex-row justify-between w-full">
                    <h4>Watchlist</h4>
                    <button className="pb-10 w-[30px] h-[30px] border flex justify-center items-center rounded-full text-xl hover:bg-[#666666] " onClick={toggleSearchTab}>+</button>
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
        </div>

    );
}