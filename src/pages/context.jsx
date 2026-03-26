import React,{useState} from "react";
import { WatchlistContext } from "./context.js";

export const WatchlistProvider = (({children})=>{
    const [watchlistArray, setWatchlistArray] = useState(null);
    return(
        <WatchlistContext.Provider value={[watchlistArray , setWatchlistArray]}>
            {children}
        </WatchlistContext.Provider>
    );
});