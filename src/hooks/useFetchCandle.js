import {useState} from "react";
export function useFetchCandle(connectionName , ticker , interval){
    const [candle , setCandle] = useState(null);

    const handlerRef = useRef(null);
    
}