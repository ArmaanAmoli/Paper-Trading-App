import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts";
import { useEffect, useRef, useState, useContext } from "react";
import { fetchData } from "./dataRequester";
import { useCallback } from "react";
import { CrosshairMode } from "lightweight-charts";
import { IndicatorsList } from "../context.js";
import { useTicker } from "../../hooks/useTicker.js";
import { PaneManager } from "../../lib/paneManager.js";

const INTERVAL_SECONDS = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "90m": 5400,
    "1d": 86400,
    "5d": 86400 * 5,
    "1wk": 86400 * 7
};

export default function CandleStickChartComponent({ ticker, interval, period }) {
    const currentData = useTicker("quote", ticker); // WS connection for realtime candle
    const [indicatorList, setIndicatorList] = useContext(IndicatorsList); // List of currently in use indicators

    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const indicatorRef = useRef([]);
    const [data, SetData] = useState([]);

    const paneManagerRef = useRef(null);
    const ohlcvDataRef = useRef([]);


    // function to update chart
    const mergePriceIntoLastCandle = useCallback((price) => {
        SetData(prevData => {
            if (!seriesRef.current || !prevData.length) return prevData;

            const intervalSec = INTERVAL_SECONDS[interval];
            const now = Math.floor(Date.now() / 1000);
            const candleTime = Math.floor(now / intervalSec) * intervalSec;

            const lastCandle = prevData[prevData.length - 1];

            let updated;
            if (lastCandle.time === candleTime) {
                updated = {
                    ...lastCandle,
                    high: Math.max(lastCandle.high, price),
                    low: Math.min(lastCandle.low, price),
                    close: price,
                };
                ohlcvDataRef.current[ohlcvDataRef.current.length - 1] = updated;
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
                ohlcvDataRef.current.push(newCandle);
                seriesRef.current.update(newCandle);

                return [...prevData, newCandle];
            }

            return prevData;
        });
    }, [interval]);

    //fetching Historical data
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
            ohlcvDataRef.current = finalData
            SetData(finalData);
        }
        getData();
    }, [ticker, interval, period]);

    //Creating the chart
    useEffect(() => {
        //return if either no container exist for keeping chart or if a chart already exist.
        if (!chartContainerRef.current || chartRef.current) return;
        const chart = createChart(chartContainerRef.current, {
            autoSize: true,
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

            crosshair: { mode: CrosshairMode.Normal },
            

        });

        // chart.applyOptions({
        //     crosshair: {
        //         // Change mode from default 'magnet' to 'normal'.
        //         mode: CrosshairMode.Normal,
        //     },
        //     layout: {
        //         panes: {
        //             separatorColor: 'rgba(255, 255, 255, 0.25)'
        //         }
        //     }
        // });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',   // Green for increasing price
            downColor: '#ef5350', // Red for decreasing price
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        }, 0);

        chartRef.current = chart;
        seriesRef.current = series;
        paneManagerRef.current = new PaneManager(chart);

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
            paneManagerRef.current = null;
        };
    }, []);

    // Set candle data when fetched or ticker/interval changes
    useEffect(() => {
        if (!seriesRef.current || !data.length) return;
        seriesRef.current.setData(data);
    }, [data]);

    // Websockts updating candlestick
    useEffect(() => {
        if (!seriesRef.current || currentData.currentPrice === 0) return;
        const quote = currentData;
        const price = quote.currentPrice;
        mergePriceIntoLastCandle(price);
    }, [mergePriceIntoLastCandle, currentData]);


    //Render indicators whenever indicatorList changes
    useEffect(() => {

        const pm = paneManagerRef.current;
        const chart = chartRef.current;
        if (!pm || !chart || !data.length) return;

        if (indicatorList.length !== 0) {

            indicatorRef.current = [];
            const priceByTime = new Map(data.map((candle) => [candle.time, candle]));

            for (let i in indicatorList) {
                const item = indicatorList[i];
                const id = JSON.stringify(item);
                if (pm.has(id)) continue;

                const indicatorType = item.indicator;
                console.log(id);

                switch (indicatorType) {
                    case "SMA":
                    case "EMA": {
                        const [line] = pm.add(id,
                            [{ type: 'line', options: { color: item.lineColor, lineWidth: 2 } }],
                            true
                        )

                        const finalData = item.data.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote[indicatorType])
                            };
                        })
                        line.setData(finalData);
                        break;
                    }

                    case "VOL": {

                        const [hist] = pm.add(id, [{
                            type: 'histogram',
                            options: {
                                priceFormat: { type: 'volume' },
                                priceScaleId: 'volume-overlay'
                            }
                        }], true);

                        chart.priceScale('volume-overlay').applyOptions({
                            scaleMargins: {
                                top: 0.85,    // Volume starts at 80% from the top
                                bottom: 0.01, // Tiny gap at the very bottom
                            },


                        });

                        const finalData = item.data.map((quote) => {
                            const time = (new Date(quote.Date)).getTime() / 1000;
                            const candle = priceByTime.get(time);
                            const isGreen = candle ? (candle.close - candle.open >= 0) : true;

                            return {
                                time,
                                value: Number(quote['Volume']),
                                color: isGreen ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)'
                            };
                        })
                        // console.log("final data: ", finalData);
                        hist.setData(finalData);
                        break;
                    }

                    case "RSI": {
                        const overBrought = {
                            price: item.overBroughtLevel,          // The specific horizontal level
                            color: '#ed8d07',      // Line color
                            lineWidth: 1,          // Line thickness
                            lineStyle: 2,          // 0: Solid, 1: Dotted, 2: Dashed
                            axisLabelVisible: true, // Show the price on the Y-axis
                            title: 'Overbought',    // Label for the line
                        };

                        const overSold = {
                            price: item.overSoldLevel,
                            color: '#ed8d07',
                            lineWidth: 1,
                            lineStyle: 2,
                            axisLabelVisible: true,
                            title: 'Oversold',
                        };

                        const [rsiLine] = pm.add(id, [{
                            type: 'line',
                            options: {
                                color: '#FCF4A3', lineWidth: 1,
                                priceFormat: {
                                    type: 'price',
                                    precision: 2,
                                    minMove: 0.01,
                                },
                                priceScaleId: `rsi-scale-${id}`,
                                autoscaleInfoProvider: () => ({
                                    priceRange: {
                                        minValue: 0,
                                        maxValue: 100,
                                    },
                                }),

                            },
                        }]);

                        rsiLine.createPriceLine(overBrought);
                        rsiLine.createPriceLine(overSold);

                        const finalData = item.data.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote[indicatorType])
                            };
                        })
                        rsiLine.setData(finalData);
                        break;
                    }

                    case "OBV": {

                        const [OBVLine] = pm.add(id, [{
                            type: 'line',
                            options: {
                                color: item.lineColor, lineWidth: 1,
                                priceFormat: {
                                    type: 'volume',
                                    precision: 2,
                                    minMove: 0.01,
                                },
                                priceScaleId: `obv-${id}`,
                            }

                        }]);
                        const finalData = item.data.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote[indicatorType])
                            };
                        })
                        OBVLine.setData(finalData);
                        break;
                    }

                    case "BBAND": {
                        // const {DOWN , MIDDLE , UP} = item.data;
                        const DOWN = item.data["DOWN"];
                        const MIDDLE = item.data["MIDDLE"];
                        const UP = item.data["UP"];


                        const finalDataDown = DOWN.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote.BBAND_DOWN)
                            };
                        });

                        const finalDataMiddle = MIDDLE.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote.BBAND_MIDDLE)
                            };
                        });

                        const finalDataUp = UP.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote.BBAND_UP)
                            };
                        });

                        const [lineUp, lineMiddle, lineDown] = pm.add(id, [
                            { type: 'line', options: { color: item.upLineColor, lineWidth: 1 } },
                            { type: 'line', options: { color: item.lineColor, lineWidth: 2 } },
                            { type: 'line', options: { color: item.downLineColor, lineWidth: 1 } }
                        ], true)

                        lineUp.setData(finalDataUp);
                        lineMiddle.setData(finalDataMiddle);
                        lineDown.setData(finalDataDown);
                        indicatorRef.current.push({ "BBAND": [lineUp, lineMiddle, lineDown] });

                        break;
                    }

                    case "STOCH":
                        {
                            const SLOWD = item.data["SLOWD"];
                            const SLOWK = item.data["SLOWK"];
                            const stochScaleId = `stoch-${id}`;
                            const finalSlowd = SLOWD.map((quote) => {
                                return {
                                    time: (new Date(quote.Date)).getTime() / 1000,
                                    value: Number(quote.SLOWD)
                                };
                            })

                            const finalSlowk = SLOWK.map((quote) => {
                                return {
                                    time: (new Date(quote.Date)).getTime() / 1000,
                                    value: Number(quote.SLOWK)
                                };
                            })

                            const [slowD, slowK] = pm.add(id, [
                                { type: 'line', options: { color: item.slowLineColor, lineWidth: 1, priceScaleID: stochScaleId } },
                                { type: 'line', options: { color: item.fastLineColor, lineWidth: 1, priceScaleID: stochScaleId } }
                            ])

                            // slowD.priceScale().applyOptions({
                            //     autoscale: false,
                            //     scaleMargins: { top: 0.1, bottom: 0.1 },

                            // });
                            slowD.setData(finalSlowd);
                            slowK.setData(finalSlowk);
                            break;
                        }

                    default:
                        console.log("INDICATOR NOT FOUND");
                }
            }
            indicatorRef.current = [];
            setIndicatorList([]);
        }
        return;
    }, [indicatorList, setIndicatorList, data]);


    return (
        <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
    );

}