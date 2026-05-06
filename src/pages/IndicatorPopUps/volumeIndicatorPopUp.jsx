import { useParams } from "react-router-dom";
import { useState, useContext } from "react";
import { IndicatorsList } from "../context";
import { fetchIndicatorData } from "../Charts/dataRequester";

export default function VolumePopUp({ Interval }) {
    const { ticker } = useParams();
    const [lineColor, setLineColor] = useState("#2196F3")
    const [typeOfVol, setTypeOfVol] = useState("VOL"); // VOL OR OBV
    const [indicatorList, setIndicatorList] = useContext(IndicatorsList);

    const volI = async () => {
        let properties = {
            ticker: ticker,
            interval: Interval,
            period: 'max',
            indicator: typeOfVol,
            lineColor:lineColor,
        }
        const data = await fetchIndicatorData(properties);
        // console.log('data-vol',data)
        properties = { ...properties, data: data };
        setIndicatorList([...indicatorList, properties]);
    }

    return (
        <div className="absolute h-50 w-70 bg-black border border-white/15 rounded-xl z-1000 p-2 flex flex-col gap-2">
            <h1 className="text-xl font-bold mb-2 w-full text-center">Volume</h1>

            <label className="flex gap-2 w-full">
                <p>Type:</p>
                <select className="bg-black border border-white/10" value={typeOfVol} onChange={(e) => setTypeOfVol(e.target.value)}>
                    <option value="VOL">VOL</option>
                    <option value="OBV">OBV</option>
                </select>
            </label>

            {
                typeOfVol === "OBV" &&
                <label className="flex gap-2 w-full">
                    <p>Line Color:</p>
                    <input className="w-1/3 border border-white/10" value={lineColor} type="text" onChange={e => setLineColor(e.target.value)}></input>
                </label>
            }

            <button className="h-8 w-17 border font-bold bg-[#1877F2] border-white/5 rounded-[38px] ml-auto" onClick={() => { volI() }}>Add</button>
        </div>
    );
}