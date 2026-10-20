import { useContext } from "react";
import { WatchlistContext } from "../Context/context.js";
import { addToWatchlist } from "../services/watchlist.js";

export default function SearchResultComponent({ info = null }) {
    const { watchlistArrayState } = useContext(WatchlistContext);
    const watchlistArray = watchlistArrayState[0];
    const setWatchlistArray = watchlistArrayState[1];
    
    if (!info) return null;
    
    // Handle both API response formats: direct object or wrapped in .info
    const data = info.info || info;
    
    if (!data || !data.symbol) return null;
    
    const { symbol, shortname, typeDisp, exchange } = data;
    
    return (
        <div className="group relative w-full h-full grid grid-cols-6 gap-2 p-2 bg-background border border-border rounded-lg hover:border-blue/50 hover:bg-blue-subtle/50 transition-all duration-150 cursor-pointer">
            <div className="col-span-3 min-w-0">
                <p className="text-sm font-medium text-text-primary tabular-nums truncate">{symbol}</p>
                <p className="text-xs text-text-muted truncate">{shortname || ''}</p>
            </div>
            <div className="col-span-2 text-sm text-text-secondary text-right">{typeDisp || ''}</div>
            <div className="col-span-1 text-sm text-text-muted text-right">{exchange || ''}</div>

            <button
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-surface-raised border border-border rounded-full hover:bg-blue-subtle hover:border-blue hover:text-blue transition-all duration-150 focus:opacity-100 focus:ring-2 focus:ring-blue focus:ring-offset-2 focus:ring-offset-background"
                onClick={async () => {
                    const res = await addToWatchlist(symbol);
                    if (res.success) {
                        setWatchlistArray([...watchlistArray, symbol]);
                    }
                }}
                aria-label={"Add " + symbol + " to watchlist"}
            >
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
}