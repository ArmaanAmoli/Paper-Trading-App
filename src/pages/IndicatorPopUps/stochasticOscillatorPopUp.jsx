import { useParams } from "react-router-dom";
import { useState , useContext} from "react";
import { IndicatorsList } from "../context";
import { fetchIndicatorData } from "../Charts/dataRequester";

export default function StochasticOscillatorPopUp({Interval}){
    const {ticker} = useParams();
    const [timePeriod , setTimePeriod] = useState(14);

    const [slowLineColor , setSlowLineColor] = useState("#FF9D23")
    const [fastLineColor , setFastLineColor] = useState("#EA5252")

    const [typeOfMA , setTypeOfMA] = useState("SMA");
    const [indicatorList , setIndicatorList]= useContext(IndicatorsList);
    const [fastPeriod , setFastPeriod] = useState(5);
    const [slowkPeriod , setSlowkPeriod] = useState(3);
    const [slowkMaType , setSlowkMaType] = useState("SMA");
    const [slowdPeriod , setSlowdPeriod] = useState(3);
    const [slowdMaType , setSlowdMaType] = useState("SMA");

    const stoch = async () => {
        let properties = {
            ticker: ticker,
            interval: Interval,
            period: 'max',
            indicator: "STOCH",

            fastPeriod: fastPeriod,
            slowkPeriod: slowkPeriod,
            slowkMatype: slowkMaType==="SMA"?0:1, // 0->SMA 1->EMA
            slowdPeriod: slowdPeriod,
            slowdMatype: slowdMaType==="SMA"?0:1,

            indicatorInterval: timePeriod,

            slowLineColor: slowLineColor,
            fastLineColor: fastLineColor,
        }
        const data = await fetchIndicatorData(properties);
        console.log("STOCH:", data)
        properties = { ...properties, data: data };
        setIndicatorList([...indicatorList, properties]);
    }

    return(
        <div className="absolute h-100 w-100 bg-black border border-white/15 rounded-xl z-1000 p-2 flex flex-col gap-2">
            <h1 className="text-xl font-bold mb-2 w-full text-center">Stochastic Oscillator</h1>

            <label className="flex gap-2 w-full">
                <p>Timeperiod:</p>
                <input className="w-1/4 border border-white/10" value={timePeriod} type="number"  onChange={e=>setTimePeriod(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Fast TP:</p>
                <input className="w-1/4 border border-white/10" value={fastPeriod} type="number"  onChange={e=>setFastPeriod(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Slowk TP:</p>
                <input className="w-1/4 border border-white/10" value={slowkPeriod} type="number"  onChange={e=>setSlowkPeriod(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Slowk MA:</p>
                <select className="bg-black border border-white/10" value={slowkMaType} onChange={(e)=>setSlowkMaType(e.target.value)}>
                    <option value="SMA">SMA</option>
                    <option value="EMA">EMA</option>
                </select>
            </label>
            
            <label className="flex gap-2 w-full">
                <p>Slowd TP:</p>
                <input className="w-1/4 border border-white/10" value={slowdPeriod} type="number"  onChange={e=>setSlowdPeriod(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Slowd MA:</p>
                <select className="bg-black border border-white/10" value={slowdMaType} onChange={(e)=>setSlowdMaType(e.target.value)}>
                    <option value="SMA">SMA</option>
                    <option value="EMA">EMA</option>
                </select>
            </label>

            <label className="flex gap-2 w-full">
                <p>Slow Line Color:</p>
                <input className="w-1/3 border border-white/10" value={slowLineColor} type="text"  onChange={e=>setSlowLineColor(e.target.value)}></input>
                <p>Fast Line Color:</p>
                <input className="w-1/3 border border-white/10" value={fastLineColor} type="text"  onChange={e=>setFastLineColor(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Type:</p>
                <select className="bg-black border border-white/10" value={typeOfMA} onChange={(e)=>setTypeOfMA(e.target.value)}>
                    <option value="SMA">SMA</option>
                    <option value="EMA">EMA</option>
                </select>
            </label>

            <button className="h-8 w-17 border font-bold bg-[#1877F2] border-white/5 rounded-[38px] ml-auto" onClick={()=>{stoch()}}>Add</button>
        </div>
    );
}