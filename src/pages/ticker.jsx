import "./styles/watchlist.css";
import { fetchQuote } from "./Charts/dataRequester";
import { useEffect , useState} from "react";
import { useNavigate } from 'react-router-dom';
export default function Ticker({ name }) {
    const navigate = useNavigate();

    const handleDivClick = ()=>{
        navigate(`/chart/${name}`)
    }

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
        <div className="ticker" onClick={handleDivClick}>
            <p className = "Symbol">
                {name}
            </p>
            <p className = "price">
                {quote.currentPrice}
            </p>
            <p className = "change" style={{color:quote.change<0?'red':'#8bf31c'}}>
                {quote.change}
            </p>
            <p className = "per-change" style={{color:quote.percentChange<0?'red':'#8bf31c'}} >
                {quote.percentChange}%
            </p>

        </div>
    );
}