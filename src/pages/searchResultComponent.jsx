import { useContext } from "react";
import { addToWatchlist } from "./watchlist";
import { WatchlistContext } from "./context";
// symbol shortName type exchange
export default function SearchResultComponent(info = null) {
    const [watchlistArray , setWatchlistArray] = useContext(WatchlistContext);
    //if (info === null) return (<></>);
    console.log(info.info);
    const { symbol, shortname, typeDisp, exchange } = info.info;
    return (
        <div className="group relative w-full h-full grid grid-cols-10 gap-1 
        border border-transparent hover:bg-white/15 cursor-pointer py-1">

            <div className="col-span-2 flex justify-center items-center pl-4">{symbol}</div>
            <div className="col-span-4 flex justify-center items-center pl-4">{shortname}</div>
            <div className="col-span-2 flex justify-center items-center pl-4">{typeDisp}</div>
            <div className="col-span-2 flex justify-center items-center pl-4">{exchange}</div>

            <div className="absolute inset-0 opacity-0 hover:opacity-100 
            transition-opacity duration-300 flex items-center justify-end">
                <button className="w-[30px] h-[30px] flex justify-center 
                    items-center rounded-full cursor-pointer bg-cover bg-no-repeat
                    bg-[url('../../src/assets/Icons/add-button.png')]" onClick={async () => {
                        const res = await addToWatchlist(symbol)
                        if(res.success){
                            setWatchlistArray([...watchlistArray , symbol]);
                        }
                    }} ></button>

            </div>
        </div>
    );
}