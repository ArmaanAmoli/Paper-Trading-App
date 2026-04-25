import { WatchlistContext } from "./context";
// import { fetchQuote } from "./Charts/dataRequester";
import { useContext} from "react";
import { useNavigate } from 'react-router-dom';
import { deleteFromWatchlist } from "./watchlist";
import { useTicker } from "../hooks/useTicker";

export default function Ticker({ name }) {
    const navigate = useNavigate();
    const quote = useTicker("quote" , name);
    const [watchlistArray, setWatchlistArray] = useContext(WatchlistContext);
    const handleDivClick = ()=>{
        navigate(`/chart/${name}`);
    }

    // const [quote , setQuote] = useState([]);
    // useEffect(()=>{
    //     if(!name) return;
    //     async function QuoteFromYahoo() {
    //         try{
    //             const data = await fetchQuote(name);
    //             console.log(data)
    //             setQuote(data);
    //         }catch(err){
    //             console.log(err);
    //         }
    //     }
    //     QuoteFromYahoo();
    //     const intervalID = setInterval(QuoteFromYahoo , 30000);
    //     return ()=> clearInterval(intervalID);
    // },[name]);
    if(!quote) return <div>Loading...</div>
    return (
        
        <div className="group relative w-full h-[40px] grid grid-cols-9 pl-[4px] items-center border border-white/10
        hover:bg-white/20 transition-color duration-150 ease-in-out" onClick={handleDivClick}>

            <p className = "col-span-3 ">
                {name}
            </p>
            <p className = "col-span-2">
                {quote.currentPrice}
            </p>
            <p className = "col-span-2" style={{color:quote.change<0?'red':'#8bf31c'}}>
                {quote.change}
            </p>
            <p className = "col-span-2" style={{color:quote.percentChange<0?'red':'#8bf31c'}} >
                {quote.percentChange}%
            </p>

            <button className="absolute flex right-2 opacity-0 group-hover:opacity-100 h-full w-[25px]
            cursor-pointer bg-contain bg-no-repeat bg-[url('../../src/assets/Icons/delete-icon.png')] bg-center" onClick={async (e)=>{
                e.stopPropagation();
                const res = await deleteFromWatchlist(name);
                if(res.success){
                    setWatchlistArray(prev=>prev.filter(item=>item!==name));
                }
                // Here we will run the delete code
            }}></button>

        </div>
    );
}