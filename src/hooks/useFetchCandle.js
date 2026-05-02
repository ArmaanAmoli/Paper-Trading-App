import {useEffect, useState , useRef} from "react";
import { wsManager } from "../lib/wsManager";
export function useFetchCandle(connectionName , ticker , interval){
    const [candle , setCandle] = useState(null);

    const handlerRef = useRef(null);
    useEffect(()=>{
        if(!handlerRef.current){
            handlerRef.current = (msg)=>setCandle(msg);
        }
    },[]);
    useEffect(()=>{
        if(!ticker)return;
        wsManager.subscriber(connectionName , ticker , handlerRef.current , interval);
        return ()=>{wsManager.unsubscriber(connectionName , ticker , handlerRef.current , interval)}
    },[connectionName , ticker , interval]);

    if(candle == null){
        if(candle === null) return {'Open': 0, 'High': 0, 'Low': 0 , 'Close':0};
    }
    return candle;
}