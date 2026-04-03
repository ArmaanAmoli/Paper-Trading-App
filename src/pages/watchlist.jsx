import Ticker from "./ticker.jsx";
import {useState , useContext } from "react";
import SearchTabPopUp from "./floatingSearchTab.jsx";
import { createPortal } from "react-dom";
// import { getWatchlist } from "./watchlist.js";
import { WatchlistContext } from "./context.js";

export default function Watchlist() {
    const [searchTabOpen, setSearchTabOpen] = useState(false);
    const toggleSearchTab = () => {
        setSearchTabOpen(prev => !prev)
    }
    const [watchlistArray, setWatchlistArray] = useContext(WatchlistContext);

    return (
        <div className="w-full h-full min-h-0 flex flex-col overflow-hidden">
            {
                searchTabOpen && (createPortal(<SearchTabPopUp close={toggleSearchTab} />, document.body))
            }
            <div className="stock-list w-full h-full min-h-0 flex flex-col">
                <div className="py-2.5 grid grid-cols-10">
                    <h4 className="col-span-8">Watchlist</h4>

                    <button className="col-span-1 w-[30px] h-[30px] flex justify-center 
                    items-center rounded-full cursor-pointer bg-cover bg-no-repeat
                    bg-[url('../../src/assets/Icons/add-button.png')]" onClick={toggleSearchTab}></button>

                    <button className="col-span-1 w-[30px] h-[30px] flex justify-center 
                    items-center rounded-full cursor-pointer bg-cover bg-no-repeat
                    bg-[url('../../src/assets/Icons/editpencil.png')]"></button>

                </div>

                <div className="w-full h-[35px] grid grid-cols-9 pl-[4px] items-center border-b border-white/20 italic font-bold">
                    <p className="col-span-3 ">Symbol</p>
                    <p className="col-span-2">Price</p>
                    <p className="col-span-2">Change</p>
                    <p className="col-span-2">%Change</p>

                </div>
                <div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
                    {watchlistArray!=null && watchlistArray.map((tick) => (
                        <div className="w-full" key={tick + "div"}>
                            <Ticker key={tick} name={tick}/>
                        </div>

                    ))

                    }
                </div>

            </div>
        </div>

    );
}