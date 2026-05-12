import { useParams } from "react-router-dom";
import { useId , useState , useContext} from "react";
import { IndicatorsList } from "../context";
import { fetchIndicatorData } from "../Charts/dataRequester";

export default function MovingAvgPopUp({Interval}){
    const {ticker} = useParams();
    const [timePeriod , setTimePeriod] = useState(14);
    const [lineColor , setLineColor] = useState("#2196F3")
    const timeperiodInputID = useId();
    const [typeOfMA , setTypeOfMA] = useState("SMA");
    const [indicatorList , setIndicatorList]= useContext(IndicatorsList);

    const ma = async ()=>{
            let properties = {
                ticker:ticker,
                interval:Interval,
                period:'max',
                indicator:typeOfMA,
                timeperiod:timePeriod,
                lineColor:lineColor
            }
            const data = await fetchIndicatorData(properties);
            properties = {...properties , data:data};
            setIndicatorList([...indicatorList , properties]);
        }

    return(
        <div className="absolute h-50 w-70 bg-black border border-white/15 rounded-xl z-1000 p-2 flex flex-col gap-2">
            <h1 className="text-xl font-bold mb-2 w-full text-center">Moving Average</h1>
            <label className="flex gap-2 w-full">
                <p>Timeperiod:</p>
                <input className="w-1/4 border border-white/10" value={timePeriod} id={timeperiodInputID} type="number"  onChange={e=>setTimePeriod(e.target.value)}></input>
            </label>
            <label className="flex gap-2 w-full">
                <p>Line Color:</p>
                <input className="w-1/3 border border-white/10" value={lineColor} id={timeperiodInputID} type="text"  onChange={e=>setLineColor(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Type:</p>
                <select className="bg-black border border-white/10" value={typeOfMA} onChange={(e)=>setTypeOfMA(e.target.value)}>
                    <option value="SMA">SMA</option>
                    <option value="EMA">EMA</option>
                </select>
            </label>

            <button className="h-8 w-17 border font-bold bg-[#1877F2] border-white/5 rounded-[38px] ml-auto" onClick={()=>{ma()}}>Add</button>
        </div>
    );
}