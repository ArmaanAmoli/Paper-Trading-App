import { useParams } from "react-router-dom";
import { useState, useContext } from "react";
import { IndicatorsList } from "../context";
import { fetchIndicatorData } from "../Charts/dataRequester";

export default function RSIPopUp({ Interval }) {
    const { ticker } = useParams();
    const [timePeriod, setTimePeriod] = useState(14);
    const [lineColor, setLineColor] = useState("#FFEB3B")
    const [indicatorList, setIndicatorList] = useContext(IndicatorsList);
    const [overBroughtLevel, setOverBroughtLevel] = useState(70);
    const [overSoldLevel, setOverSoldLevel] = useState(30);

    const rsi = async () => {
        let properties = {
            ticker: ticker,
            interval: Interval,
            period: 'max',
            indicator: 'RSI',
            indicatorInterval: timePeriod,
            lineColor: lineColor,
            overBroughtLevel:overBroughtLevel,
            overSoldLevel:overSoldLevel
        }
        const data = await fetchIndicatorData(properties);
        properties = { ...properties, data: data };
        setIndicatorList([...indicatorList, properties]);
    }

    return (
        <div className="absolute h-55 w-70 bg-black border border-white/15 rounded-xl z-1000 p-2 flex flex-col gap-2">
            <h1 className="text-xl font-bold mb-2 w-full text-center">Relative Strength Index</h1>
            <label className="flex gap-2 w-full">
                <p>Timeperiod:</p>
                <input className="w-1/4 border border-white/10" value={timePeriod} type="number" min="0" max="100" onChange={e => setTimePeriod(e.target.value)}></input>
            </label>
            <label className="flex gap-2 w-full">
                <p>Line Color:</p>
                <input className="w-1/3 border border-white/10" value={lineColor} type="text" onChange={e => setLineColor(e.target.value)}></input>
            </label>
            <label className="flex gap-2 w-full">
                <p>Overbought:</p>
                <input className="w-1/4 border border-white/10" value={overBroughtLevel} type="number" min="0" max="100" onChange={e => setOverBroughtLevel(e.target.value)}></input>
            </label>
            <label className="flex gap-2 w-full">
                <p>Oversold:</p>
                <input className="w-1/4 border border-white/10" value={overSoldLevel} type="number" min="0" max="100" onChange={e => setOverSoldLevel(e.target.value)}></input>
            </label>

            <button className="h-8 w-17 border font-bold bg-[#1877F2] border-white/5 rounded-[38px] ml-auto" onClick={() => { rsi() }}>Add</button>
        </div>
    );
}