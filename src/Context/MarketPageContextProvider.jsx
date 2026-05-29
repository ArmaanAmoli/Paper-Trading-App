import { useEffect, useState } from "react";
import { wsManager } from "../lib/wsManager"
import marketSymbols from "../services/Indices data/indicesFullName.json"
import { useTicker } from "../hooks/useTicker";
import { MarketData } from "./context.js";
/*
Store a global mapping of useTicker hook from where all the market data can be tracked.
*/
export default function MarketDataProvider({ children }) {
    const [marketDataMap, setMarketDataMap] = useState(new Map());
    useEffect(() => {
        const tickers = Object.keys(marketSymbols);
        const handlers = new Map();

        tickers.forEach((ticker) => {
            const handler = ((data) => {
                setMarketDataMap((prev) => {
                    console.log(data);
                    const next = new Map(prev);
                    next.set(ticker, data);
                    return next;
                });
            });
            handlers.set(ticker, handler);
            wsManager.subscriber("quote", ticker, handler);
        });
        return () => {
            tickers.forEach((ticker)=>{
                wsManager.unsubscriber("quote" , ticker , handlers.get(ticker));
            });
        }

    }, []);
    return (
        <MarketData.Provider value={marketDataMap}>
            {children}
        </MarketData.Provider>
    );
}