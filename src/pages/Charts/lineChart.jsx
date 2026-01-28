import { createChart, LineSeries, ColorType, AreaSeries } from "lightweight-charts";
import React, { useEffect, useRef, useState } from "react";
// import { Daily } from "../../../AlphaVantageApi/Daily.js";
import { weeklyAjusted } from "../../../AlphaVantageApi/weeklyAdjusted.js";

function transformData(apiResponse) {
    const series = apiResponse["Weekly Adjusted Time Series"];

    return Object.keys(series)
        .map(date => ({
            time: date,
            value: Number(series[date]["5. adjusted close"]),
        }))
        .reverse(); // oldest → newest
}

export default function LineChart({ ticker }) {
    const chartContainer = useRef();
    const [data, setData] = useState([]);

    // Fetch data
    useEffect(() => {
        if (!ticker) return;

        const fetchData = async () => {
            const apiData = await weeklyAjusted(ticker);
            const formatted = transformData(apiData);
            setData(formatted);
        };

        fetchData();
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

    return <div ref={chartContainer} />;
}