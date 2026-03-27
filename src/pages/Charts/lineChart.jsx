import { createChart, ColorType, AreaSeries } from "lightweight-charts";
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
    const chartContainer = useRef(null); // stores the container reference of div below
    const chartRef = useRef(null); // store the chart object
    const seriesRef = useRef(null); // store the data series
    const [data, setData] = useState([]);

    // Fetch data
    useEffect(  () => {
        if (!ticker) return;
        
        const dataFromYahoo = async () =>{
            try {
                let dataFromYahooJSON =  await fetchData(ticker , '1d' , '2y');
                
                // ensured data is an array
                if (Array.isArray(dataFromYahooJSON)) {
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

    useEffect(() => {
        if (!chartContainer.current || chartRef.current) return;

        const container = chartContainer.current;
        const initialWidth = container.clientWidth || 600;
        const initialHeight = container.clientHeight || 300;

        const chart = createChart(container, {
            autoSize: true,
            width: initialWidth,
            height: initialHeight,
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

        chartRef.current = chart;
        seriesRef.current = series;

        const handleResize = () => {
            if (!chartRef.current || !chartContainer.current) return;
            const nextWidth = chartContainer.current.clientWidth;
            const nextHeight = chartContainer.current.clientHeight;
            if (!nextWidth || !nextHeight) return;
            chartRef.current.applyOptions({ width: nextWidth, height: nextHeight });
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
        window.addEventListener("resize", handleResize);

        // Run once after mount so the chart picks up final flex/grid dimensions.
        requestAnimationFrame(handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!seriesRef.current || !data.length) return;
        seriesRef.current.setData(data);
    }, [data]);

    return (
    <>
    <div ref={chartContainer} style={{ width: "100%", height: "100%", minHeight: "260px" }} />
    </>);
}