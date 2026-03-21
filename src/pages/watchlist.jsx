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
                <div className="py-2.5 grid grid-cols-10">
                    <h4 className="col-span-8">Watchlist</h4>

                    <button className="col-span-1 w-[30px] h-[30px] flex justify-center 
                    items-center rounded-full cursor-pointer bg-cover bg-no-repeat
                    bg-[url('../../src/assets/Icons/add-button.png')]" onClick={toggleSearchTab}></button>

                    <button className="col-span-1 w-[30px] h-[30px] flex justify-center 
                    items-center rounded-full cursor-pointer bg-cover bg-no-repeat
                    bg-[url('../../src/assets/Icons/editpencil.png')]"></button>

                </div>

                <div className="heading-wl">
                    <p>Symbol</p>
                    <p>Price</p>
                    <p>Change</p>
                    <p>%Change</p>
                </div>
                <div className="w-full h-full flex flex-col">
                    <Ticker name="RR.L" />
                    <Ticker name="^FTSE" />
                    <Ticker name="LLY" />
                </div>
                
            </div>
        </div>

    );
}