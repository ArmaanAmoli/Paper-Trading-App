import { useEffect, useState} from "react";
import { useRef } from "react";
import { wsManager } from "../lib/wsManager"
import marketSymbols from "../services/Indices data/indicesFullName.json"
import { useTicker } from "../hooks/useTicker";
import { MarketData } from "./context.js";
/*
Store a global mapping of useTicker hook from where all the market data can be tracked.
*/
export default function MarketDataProvider({ children }) {
    const [marketDataMap, setMarketDataMap] = useState(new Map());
    const dataRef = useRef(new Map());
    const flushPending = useRef(false);

    useEffect(() => {
        const tickers = Object.keys(marketSymbols);
        const handlers = new Map();
        const handler = (ticker) => (data) => {
            dataRef.current.set(ticker , data);
            if(!flushPending.current){
                flushPending.current = true;
                requestAnimationFrame(()=>{
                    flushPending.current = false;
                    setMarketDataMap(dataRef.current);
                });
            }
        };

        tickers.forEach((ticker)=>{
            handlers.set(ticker , handler(ticker));
            wsManager.subscriber("quote" , ticker , handlers.get(ticker));
        })

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