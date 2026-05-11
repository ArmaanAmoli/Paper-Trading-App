import { useEffect , useRef , useState } from "react";
import { wsManager } from "../lib/wsManager";

export function useIndicator(connetionName , properties){
    const [data , setData] = useState(null);
    const handlerRef = useRef(null);

    const ticker = properties.ticker;
    const indicator = properties.indicator;

    useEffect(()=>{
        if(handlerRef.current === null){
            handlerRef.current = (msg) => setData(msg);
        }
    },[]);

    useEffect(()=>{
        if(!ticker || !indicator)return;
        const handler = handlerRef.current;
        wsManager.subscriber(connetionName , ticker , handler , properties);
        return ()=>wsManager.useIndicator(connetionName , ticker , handler , properties);
    },[connetionName , ticker , indicator , properties]);
    if(data===null)return {};
    return data;
}