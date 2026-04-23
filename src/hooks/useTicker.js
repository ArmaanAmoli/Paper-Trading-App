import { useEffect , useRef , useState } from "react";
import { wsManager } from "../lib/wsManager.js";

export function useTicker(connectionName , ticker){
    const [data , setData] = useState(null);

    const handlerRef = useRef(null);

    if(!handlerRef.current){
        handlerRef.current = (msg) => setData(msg);
    }

    useEffect(()=>{
        if(!ticker)return;
        const handler = handlerRef.current;
        wsManager.subscriber(connectionName , ticker , handler);
        return()=>wsManager.unsubscriber(connectionName , ticker , handler)
    },[connectionName , ticker])

    return data;
}