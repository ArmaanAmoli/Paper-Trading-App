import { WatchlistContext } from "../Context/context.js";
// import { fetchQuote } from "./Charts/dataRequester";
import { useContext} from "react";
import { useNavigate } from 'react-router-dom';
import { deleteFromWatchlist } from "../services/watchlist.js";
import { useTicker } from "../hooks/useTicker.js";

export default function Ticker({ name }) {
    const navigate = useNavigate();
    // const quote = useTicker("quote" , name);
    const {watchlistArrayState , watchlistMap }= useContext(WatchlistContext);
    const watchlistArray = watchlistArrayState[0];
    const setWatchlistArray = watchlistArrayState[1];
    console.log(typeof(watchlistMap));
    console.log(watchlistMap);
    const quote = watchlistMap.get(name);
    const handleDivClick = ()=>{
        navigate(`/chart/${name}`);
    }

    if(!quote) return <div>Loading...</div>
    return (
        
        <div className="group relative w-full h-[40px] grid grid-cols-9 pl-[4px] items-center border border-white/10
        hover:bg-white/20 transition-color duration-150 ease-in-out" onClick={handleDivClick}>

            <p className = "col-span-3 ">
                {name}
            </p>
            <p className = "col-span-2">
                {quote.currentPrice}
            </p>
            <p className = "col-span-2" style={{color:quote.change<0?'red':'#8bf31c'}}>
                {quote.change}
            </p>
            <p className = "col-span-2" style={{color:quote.percentChange<0?'red':'#8bf31c'}} >
                {quote.percentChange}%
            </p>

            <button className="absolute flex right-2 opacity-0 group-hover:opacity-100 h-full w-[25px]
            cursor-pointer bg-contain bg-no-repeat bg-[url('../../src/assets/Icons/delete-icon.png')] bg-center" onClick={async (e)=>{
                e.stopPropagation();
                const res = await deleteFromWatchlist(name);
                if(res.success){
                    setWatchlistArray(prev=>prev.filter(item=>item!==name));
                }
                // Here we will run the delete code
            }}></button>

        </div>
    );
}