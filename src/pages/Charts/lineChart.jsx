import { createChart, LineSeries , ColorType } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import { Daily } from "../../../AlphaVantageApi/Daily.js";
export default function lineChart(ticker){
    // Extracting the data using AV API
    const chartContainer = useRef();
    const [data,setData] = useState([]);
    useEffect(()=>{
        
    })
}