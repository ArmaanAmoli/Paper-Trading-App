import { createChart, ColorType , CandlestickSeries} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { fetchData } from "./dataRequester";

export default function CandleStickChartComponent({ticker, interval, period}) {
    const chartContainerRef = useRef();
    const [data, SetData] = useState([]);

    useEffect(() => {
        const getData = async () => {
            const rawData = await fetchData(ticker, interval, period);
            const finalData = rawData.map((quote) => {
                return ({
                    time: (new Date(quote.Date)).getTime() / 1000,
                    open: quote.Open,
                    high: quote.High,
                    low: quote.Low,
                    close: quote.Close
                });
            });
            SetData(finalData);
        }
        getData();
    }, [ticker, interval, period]);

    useEffect(() => {
        if (!data.length) return;
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: '#161616',
                textColor: 'rgba(255, 255, 255, 0.9)',
            },
            grid: {
                vertLines: { color: '#ffffff1a' },
                horzLines: { color: '#ffffff1a' },
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
                secondsVisible: false,
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
        });

        const candleStickChart = chart.addSeries(CandlestickSeries,{
            upColor: '#26a69a',   // Green for increasing price
            downColor: '#ef5350', // Red for decreasing price
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        candleStickChart.setData(data);

        const handleResize = ()=>{
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
        window.addEventListener('resize' , handleResize);

        return ()=>{
            window.removeEventListener('resize',handleResize);
            chart.remove();
        };
    }, [data]);
    return(
        <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
    );

}