import { createChart, LineSeries, ColorType, AreaSeries } from "lightweight-charts";
import React, { useEffect, useRef, useState } from "react";
import { fetchData } from "./dataRequester.js";
// import { Daily } from "../../../AlphaVantageApi/Daily.js";
//import { weeklyAjusted } from "../../../AlphaVantageApi/weeklyAdjusted.js";

function transformData(apiResponse) {
    const finalData = apiResponse.map((quote) => {

        return{
            time:(new Date(quote.Date)).getTime()/1000,
            value:Number(quote.Close)
        };
        
    });
    return finalData;
}

export default function LineChart({ ticker }) {
    const chartContainer = useRef();
    const [data, setData] = useState([]);

    // Fetch data
    useEffect(  () => {
        if (!ticker) return;
        
        const dataFromYahoo = async () =>{
            try {
                let dataFromYahooJSON =  await fetchData(ticker , '1d' , '1y');
                
                // --- FIX 1: Corrected console log & ensured data is an array
                if (Array.isArray(dataFromYahooJSON)) {
                    // --- FIX 2: Fixed the typo 'dataFromYahoo' to 'dataFromYahooJSON'
                    const transformedData = transformData(dataFromYahooJSON);
                    setData(transformedData);
                } else {
                    console.error("API did not return an array:", dataFromYahooJSON);
                }
            } catch (err) {
                // Catch any network errors or non-200 responses from Axios
                console.error("Failed to fetch data:", err.message);
            }
        }
        dataFromYahoo();
        
    }, [ticker]);

    // Create chart
    useEffect(() => {
        if (!data.length) return;

        const chart = createChart(chartContainer.current, {
            width: chartContainer.current.clientWidth,
            height: 300,

            grid: {
                vertLines: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                horzLines: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
            },

            layout: {
                background: { type: ColorType.Solid, color: "black" },
                textColor: "white",
            },
        });

        const series = chart.addSeries(AreaSeries, {
            lineColor: "#2962FF",
            topColor: "#2962ff7e",
            bottomColor: "rgba(41, 98, 255, 0.28)",
        });

        series.setData(data);

        const handleResize = () =>
            chart.applyOptions({
                width: chartContainer.current.clientWidth,
            });

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [data]);

    return (
    <>
    <h3>{ticker}</h3>
    <div ref={chartContainer} />
    </>);
}