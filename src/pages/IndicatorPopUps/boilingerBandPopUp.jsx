/*
const bband = async () => {
        let properties = {
            ticker: ticker,
            interval: Interval,
            period: 'max',
            indicator: "BBAND",
            stdUp: 2,
            stdDown: 2,
            matype: 0,
            indicatorInterval: 20 // <--------
        }
        const data = await fetchIndicatorData(properties);
        console.log('data-bband', data)
        properties = { ...properties, data: data };
        setIndicatorList([...indicatorList, properties]);
    }
*/

import { useParams } from "react-router-dom";
import { useState , useContext} from "react";
import { IndicatorsList } from "../context";
import { fetchIndicatorData } from "../Charts/dataRequester";

export default function BBandPopUp({Interval}){
    const {ticker} = useParams();
    const [timePeriod , setTimePeriod] = useState(14);

    const [lineColor , setLineColor] = useState("#2196F3")
    const [upLineColor , setUpLineColor] = useState("#2196F3")
    const [downLineColor , setDownLineColor] = useState("#2196F3")

    const [typeOfMA , setTypeOfMA] = useState("SMA");
    const [indicatorList , setIndicatorList]= useContext(IndicatorsList);
    const [stdUp , setStdUp] = useState(2);
    const [stdDown , setStdDown] = useState(2);


    const bband = async () => {
        let properties = {
            ticker: ticker,
            interval: Interval,
            period: 'max',
            indicator: "BBAND",
            stdUp: stdUp,
            stdDown: stdDown,
            matype: typeOfMA === "SMA" ? 0:1,
            indicatorInterval: timePeriod,
            lineColor: lineColor,
            upLineColor: upLineColor,
            downLineColor: downLineColor,
        }
        const data = await fetchIndicatorData(properties);
        console.log('data-bband', data)
        properties = { ...properties, data: data };
        setIndicatorList([...indicatorList, properties]);
    }

    return(
        <div className="absolute h-100 w-70 bg-black border border-white/15 rounded-xl z-1000 p-2 flex flex-col gap-2">
            <h1 className="text-xl font-bold mb-2 w-full text-center">Moving Average</h1>

            <label className="flex gap-2 w-full">
                <p>Timeperiod:</p>
                <input className="w-1/4 border border-white/10" value={timePeriod} type="number"  onChange={e=>setTimePeriod(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Std. UP:</p>
                <input className="w-1/4 border border-white/10" value={stdUp} type="number"  onChange={e=>setStdUp(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Std. Down:</p>
                <input className="w-1/4 border border-white/10" value={stdDown} type="number"  onChange={e=>setStdDown(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>MA Line Color:</p>
                <input className="w-1/3 border border-white/10" value={lineColor} type="text"  onChange={e=>setLineColor(e.target.value)}></input>
                <p>UP Line Color:</p>
                <input className="w-1/3 border border-white/10" value={upLineColor} type="text"  onChange={e=>setUpLineColor(e.target.value)}></input>
                <p>DOWN Line Color:</p>
                <input className="w-1/3 border border-white/10" value={downLineColor} type="text"  onChange={e=>setDownLineColor(e.target.value)}></input>
            </label>

            <label className="flex gap-2 w-full">
                <p>Type:</p>
                <select className="bg-black border border-white/10" value={typeOfMA} onChange={(e)=>setTypeOfMA(e.target.value)}>
                    <option value="SMA">SMA</option>
                    <option value="EMA">EMA</option>
                </select>
            </label>

            <button className="h-8 w-17 border font-bold bg-[#1877F2] border-white/5 rounded-[38px] ml-auto" onClick={()=>{bband()}}>Add</button>
        </div>
    );
}