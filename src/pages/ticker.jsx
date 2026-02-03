import "./styles/watchlist.css";
import { fetchQuote } from "./Charts/dataRequester";
import { useEffect , useState} from "react";
export default function Ticker({ name }) {
    const [quote , setQuote] = useState([]);
    useEffect(()=>{
        if(!name) return;
        async function QuoteFromYahoo() {
            try{
                const data = await fetchQuote(name);
                console.log(data)
                setQuote(data);
            }catch(err){
                console.log(err);
            }
        }
        QuoteFromYahoo();
        const intervalID = setInterval(QuoteFromYahoo , 30000);
        return ()=> clearInterval(intervalID);
    },[name]);
    return (
        <div className="ticker">
            <p className = "Symbol">
                {name}
            </p>
            <p className = "price">
                {quote.currentPrice}
            </p>
            <p className = "change">
                {quote.change}
            </p>
            <p className = "per-change">
                {quote.percentChange}%
            </p>

        </div>
    );
}