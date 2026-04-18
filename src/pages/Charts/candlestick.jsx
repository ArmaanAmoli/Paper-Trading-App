import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts";
import { useEffect, useRef, useState, useContext } from "react";
import { fetchData, fetchQuote } from "./dataRequester";
import { useCallback } from "react";
import { CrosshairMode } from "lightweight-charts";
import { IndicatorsList } from "../context.js";
const INTERVAL_SECONDS = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "1d": 86400,
};
export default function CandleStickChartComponent({ ticker, interval, period, indicators = [] }) {
    const [indicatorList, setIndicatorList] = useContext(IndicatorsList);
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const initializedRef = useRef(false);
    const indicatorRef = useRef([]);
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


        });

        chart.applyOptions({
            crosshair: {
                // Change mode from default 'magnet' to 'normal'.
                mode: CrosshairMode.Normal,
            },
            layout: {
                panes: {
                    separatorColor: 'rgba(255, 255, 255, 0.25)'
                }
            }
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
    }, [ticker, mergePriceIntoLastCandle]);

    useEffect(() => {
        /* INDICATOR CODE GOES HERE */
        if (indicatorList.length !== 0) {
            indicatorRef.current = [];
            let paneidx = 1;
            const priceByTime = new Map(data.map((candle) => [candle.time, candle]));
            for (let i in indicatorList) {
                const item = indicatorList[i];
                // const combinedData = .map((t,index))
                const indicatorType = item.indicator;
                console.log(indicatorType);
                switch (indicatorType) {
                    case "SMA":
                    case "EMA": {
                        const line = chartRef.current.addSeries(LineSeries, { color: indicatorType === 'SMA' ? '#2962FF' : '#ff29bb', lineWidth: 2 });
                        const indicatorName = `${indicatorType}-${item.indicatorInterval}`;
                        indicatorRef.current.push({ [indicatorName]: line });

                        const finalData = item.data.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote[indicatorType])
                            };
                        })
                        console.log("final data: ", finalData);
                        line.setData(finalData);
                        break;
                    }
                    // case "BBAND":{
                    //     const BBand = chartRef.addSeries()
                    // }
                    case "VOL": {
                        // Old fixed pane-index code kept for reference:
                        // const hist = chartRef.current.addSeries(HistogramSeries, {
                        //     priceFormat: { type: 'volume' }
                        // }, 1) // 1 creates the chart below the main chart (0) it is called pane index

                        // Old dynamic pane code kept for reference:
                        // const paneIndex = nextPaneIndex++;
                        // const hist = chartRef.current.addSeries(HistogramSeries, {
                        //     priceFormat: { type: 'volume' }
                        // }, paneIndex)

                        // Keep volume inside the main candlestick pane (pane 0)
                        // and compress it to the lower section using scale margins.
                        const hist = chartRef.current.addSeries(HistogramSeries, {
                            priceFormat: { type: 'volume' },
                            priceScaleId: 'volume-overlay', // Set as overlay
                        })

                        chartRef.current.priceScale('volume-overlay').applyOptions({
                            scaleMargins: {
                                top: 0.85,    // Volume starts at 80% from the top
                                bottom: 0.01, // Tiny gap at the very bottom
                            },
                        });

                        const indicatorName = "VOL";
                        indicatorRef.current.push({ [indicatorName]: hist })

                        // Old index-based color logic kept for reference:
                        // const finalData = item.data.map((quote, index) => {
                        //     return {
                        //         time: (new Date(quote.Date)).getTime() / 1000,
                        //         value: Number(quote['Volume']),
                        //         color: data[index].close - data[index].open >= 0 ? '#26a69a' : '#ef5350'
                        //     };
                        // })

                        // Align color lookup by candle time (not array index), which prevents
                        // misalignment when indicator data has a different length/order.
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
                            price: 70,          // The specific horizontal level
                            color: '#ed8d07',      // Line color
                            lineWidth: 1,          // Line thickness
                            lineStyle: 2,          // 0: Solid, 1: Dotted, 2: Dashed
                            axisLabelVisible: true, // Show the price on the Y-axis
                            title: 'Overbought',    // Label for the line
                        };

                        const overSold = {
                            price: 30,
                            color: '#ed8d07',
                            lineWidth: 1,
                            lineStyle: 2,
                            axisLabelVisible: true,
                            title: 'Oversold',
                        };

                        const rsiLine = chartRef.current.addSeries(LineSeries, {
                            color: '#FCF4A3', lineWidth: 1,
                            priceFormat: {
                                type: 'price',
                                precision: 2,
                                minMove: 0.01,
                            },
                            autoscaleInfoProvider: () => ({
                                priceRange: {
                                    minValue: 0,
                                    maxValue: 100,
                                },
                            }),
                            priceScaleId: `rsi-${paneidx}`,


                        }, paneidx);
                        paneidx = paneidx + 1;
                        rsiLine.createPriceLine(overBrought);
                        rsiLine.createPriceLine(overSold);

                        const indicatorName = `${indicatorType}-${item.indicatorInterval}`;
                        indicatorRef.current.push({ [indicatorName]: rsiLine })
                        const finalData = item.data.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote[indicatorType])
                            };
                        })
                        console.log("final data: ", finalData);
                        rsiLine.setData(finalData);
                        break;
                    }

                    case "OBV": {

                        // Old fixed pane-index code kept for reference:
                        // const OBVLine = chartRef.current.addSeries(LineSeries, {
                        //     color: 'red', lineWidth: 1,
                        //     priceFormat: {
                        //         type: 'volume',
                        //         precision: 2,
                        //         minMove: 0.01,
                        //     },
                        // },3);

                        const OBVLine = chartRef.current.addSeries(LineSeries, {
                            color: 'red', lineWidth: 1,
                            priceFormat: {
                                type: 'volume',
                                precision: 2,
                                minMove: 0.01,
                            },
                            priceScaleId: `obv-${paneidx}`,
                        }, paneidx);
                        paneidx = paneidx + 1;
                        const indicatorName = `${indicatorType}`;
                        indicatorRef.current.push({ [indicatorName]: OBVLine })
                        const finalData = item.data.map((quote) => {
                            return {
                                time: (new Date(quote.Date)).getTime() / 1000,
                                value: Number(quote[indicatorType])
                            };
                        })
                        console.log("final data: ", finalData);
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

                        const lineUp = chartRef.current.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1 });
                        const lineMiddle = chartRef.current.addSeries(LineSeries, { color: '#FF0000', lineWidth: 2 });
                        const lineDown = chartRef.current.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1 });
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
                            const stochScaleId = `stoch-${paneidx}`;
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

                            const lineFinalSlowd = chartRef.current.addSeries(LineSeries, {
                                color: 'red', lineWidth: 1,priceScaleId: stochScaleId,
                                
                            }, paneidx);

                            lineFinalSlowd.priceScale().applyOptions({
                                autoscale: false,
                                scaleMargins: { top: 0.1, bottom: 0.1 },
                                
                            });
                            lineFinalSlowd.setData(finalSlowd);

                            const lineFinalSlowk = chartRef.current.addSeries(LineSeries, {
                                color: 'blue', lineWidth: 1,priceScaleId: stochScaleId,
                                
                            },paneidx);
                            paneidx = paneidx + 1;
                            lineFinalSlowk.setData(finalSlowk);

                            

                            indicatorRef.current.push({ "STOCH": [lineFinalSlowd, lineFinalSlowk] });
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
    }, [indicatorList, ticker, interval, setIndicatorList, data]);


    return (
        <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
    );

}