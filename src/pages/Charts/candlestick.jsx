import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { fetchData, fetchQuote } from "./dataRequester";
import { useCallback } from "react";
const INTERVAL_SECONDS = {
        "1m": 60,
        "5m": 300,
        "15m": 900,
        "1h": 3600,
        "1d": 86400,
    };
export default function CandleStickChartComponent({ ticker, interval, period }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const initializedRef = useRef(false);
    const [data, SetData] = useState([]);

    
    const mergePriceIntoLastCandle = useCallback((price) => {
        SetData(prevData => {
            if (!seriesRef.current || !prevData.length) return prevData;

            const intervalSec = INTERVAL_SECONDS[interval];
            const now = Math.floor(Date.now() / 1000);
            const candleTime = Math.floor(now / intervalSec) * intervalSec;

            const lastCandle = prevData[prevData.length - 1];

            if (lastCandle.time === candleTime) {
                const updated = {
                    ...lastCandle,
                    high: Math.max(lastCandle.high, price),
                    low: Math.min(lastCandle.low, price),
                    close: price,
                };

                seriesRef.current.update(updated);

                return [
                    ...prevData.slice(0, -1),
                    updated,
                ];
            } else if (candleTime > lastCandle.time) {
                const newCandle = {
                    time: candleTime,
                    open: lastCandle.close,
                    high: price,
                    low: price,
                    close: price,
                };

                seriesRef.current.update(newCandle);

                return [...prevData, newCandle];
            }

            return prevData;
        });
    }, [interval]);

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
        if (!chartContainerRef.current || chartRef.current) return;
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
            height: chartContainerRef.current.clientHeight,
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',   // Green for increasing price
            downColor: '#ef5350', // Red for decreasing price
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        chartRef.current = chart;
        seriesRef.current = series;

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!seriesRef.current || !data.length || initializedRef.current) return;
        seriesRef.current.setData(data);
        initializedRef.current = true;
    }, [data]);

    useEffect(() => {
        if (!seriesRef.current) return;

        const intervalId = setInterval(async () => {
            try {
                const quote = await fetchQuote(ticker);
                const price = quote.currentPrice; // adjust key if needed
                mergePriceIntoLastCandle(price);
            } catch (err) {
                console.error(err);
            }
        }, 5000); // every 5 seconds

        return () => clearInterval(intervalId);
    }, [ticker , mergePriceIntoLastCandle]);


    return (
        <div ref={chartContainerRef} style={{ width: "100%", height: "100%"}}></div>
    );

}