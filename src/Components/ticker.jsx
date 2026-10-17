import { WatchlistContext } from "../Context/context.js";
import { useContext } from "react";
import { useNavigate } from 'react-router-dom';
import { deleteFromWatchlist } from "../services/watchlist.js";

export default function Ticker({ name }) {
    const navigate = useNavigate();
    const { watchlistArrayState, watchlistMap } = useContext(WatchlistContext);
    const setWatchlistArray = watchlistArrayState[1];
    const quote = watchlistMap.get(name);
    const handleRowClick = () => navigate(`/chart/${name}`);

    if (!quote) {
        return (
            <tr className="h-[44px] animate-pulse">
                <td colSpan={4} className="text-text-dim px-4 py-3">Loading...</td>
            </tr>
        );
    }

    const isPositive = quote.change > 0;
    const isNegative = quote.change < 0;
    const changePrefix = isPositive ? "+" : isNegative ? "" : "";
    const rowColorClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';

    return (
        <tr
            className="group relative h-[44px] hover:bg-surface-raised transition-colors duration-150 cursor-pointer"
            onClick={handleRowClick}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(); }}
        >
            <td className="px-4 py-3">
                <span className="text-sm font-medium text-text-primary tabular-nums truncate block max-w-[120px]">{name}</span>
            </td>
            <td className="numeric px-4 py-3">
                <span className={rowColorClass}>{quote.currentPrice.toLocaleString()}</span>
            </td>
            <td className="numeric px-4 py-3">
                <span className={rowColorClass}>{changePrefix}{quote.change.toFixed(2)}</span>
            </td>
            <td className="numeric relative px-4 py-3 pr-0">
                <span className={rowColorClass}>{changePrefix}{quote.percentChange.toFixed(2)}%</span>
                <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 btn btn-icon btn-pill hover:bg-down-bg hover:border-down/50 hover:text-red-text transition-all duration-150 focus:opacity-100 focus:ring-2 focus:ring-red-text/50 focus:ring-offset-2 focus:ring-offset-background z-20"
                    onClick={async (e) => {
                        e.stopPropagation();
                        const res = await deleteFromWatchlist(name);
                        if (res.success) {
                            setWatchlistArray(prev => prev.filter(item => item !== name));
                        }
                    }}
                    aria-label={"Remove " + name + " from watchlist"}
                >
                    <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </td>
        </tr>
    );
}