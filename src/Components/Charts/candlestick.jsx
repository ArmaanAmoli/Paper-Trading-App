import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries , LineStyle} from "lightweight-charts";
import { useEffect, useRef, useState, useContext } from "react";
import { fetchData } from "../../services/dataRequesterForCharts.js";
import { useCallback } from "react";
import { CrosshairMode } from "lightweight-charts";
import { IndicatorsList } from "../../Context/context.js";
import { useTicker } from "../../hooks/useTicker.js";
import { PaneManager } from "../../lib/paneManager.js";
import { wsManager } from "../../lib/wsManager.js";

// Helper to batch rapid series updates onto the next animation frame.
const makeBufferedSeriesUpdater = (series) => {
    let scheduled = false; // If alreay a reqAnimationFrame scheduled ?
    let lastPoint = null; // The latest price quote.
    return (point) => { // function that we will return to a useRef;
        if (!point) return;
        lastPoint = point;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            try {
                if (lastPoint) series.update(lastPoint);

            } catch (e) {
                console.warn('Series update failed', e);
            }
            scheduled = false;
            lastPoint = null;
        });
    };
};

// Create a lightweight stable id for an indicator without serializing large
// `data` arrays. Avoiding JSON.stringify(item) prevents freezing when items
// contain large historical arrays.
const makeIndicatorId = (item) => {
    return `${item.ticker}::${item.interval}::${item.indicator}::${item.timeperiod ?? ''}::${item.matype ?? ''}::${item.fastkPeriod ?? ''}::${item.slowkPeriod ?? ''}`;
};

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
    const bufferedCandleUpdaterRef = useRef(null);
    const [data, SetData] = useState([]);

    const paneManagerRef = useRef(null);
    const ohlcvDataRef = useRef([]);
    const indicatorHandlersRef = useRef(new Map()); // id -> { handler, properties }
    const latestQuotePriceRef = useRef(null);
    const lastAppliedQuotePriceRef = useRef(null);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    const getIndicatorTime = (msg) => {
        // For BBAND, use the message Date if available
        if (msg && typeof msg === "object" && msg.Date) {
            return (new Date(msg.Date)).getTime() / 1000;
        }
        // Fall back to the last candle's time (don't use current time for indicators!)
        // This ensures indicators align with candle timestamps
        if (ohlcvDataRef.current && ohlcvDataRef.current.length > 0) {
            return ohlcvDataRef.current[ohlcvDataRef.current.length - 1].time;
        }
        return Math.floor(Date.now() / 1000);
    };

    const getIndicatorValue = (msg, fieldName) => {
        // Support both numeric payloads and object payloads like:
        // { Date, SMA }, { Date, Volume }, { Date, BBAND_UP }, { Date, SLOWK }, etc.
        if (msg === null || msg === undefined) return null;
        if (typeof msg === "number") return msg;
        if (typeof msg !== "object") return Number(msg);
        if (fieldName && msg[fieldName] !== undefined) return Number(msg[fieldName]);
        if (msg.value !== undefined) return Number(msg.value);
        return null;
    };


    // function to update chart
    const mergePriceIntoLastCandle = useCallback((price) => {
        if (!Number.isFinite(price)) return;

        if (!seriesRef.current || !ohlcvDataRef.current.length) return;

        const intervalSec = INTERVAL_SECONDS[interval];
        const lastCandle = ohlcvDataRef.current[ohlcvDataRef.current.length - 1];
        const nextCandleTime = lastCandle.time + intervalSec;

        if (nextCandleTime <= lastCandle.time) {
            return;
        }

        if (Math.floor(Date.now() / 1000) < nextCandleTime) {
            const updated = {
                ...lastCandle,
                high: Math.max(lastCandle.high, price),
                low: Math.min(lastCandle.low, price),
                close: price,
            };
            ohlcvDataRef.current[ohlcvDataRef.current.length - 1] = updated;
            const updater = bufferedCandleUpdaterRef.current ?? ((p) => seriesRef.current.update(p));
            updater(updated);
        } else {
            const newCandle = {
                time: nextCandleTime,
                open: lastCandle.close,
                high: price,
                low: price,
                close: price,
            };
            ohlcvDataRef.current.push(newCandle);
            const updater = bufferedCandleUpdaterRef.current ?? ((p) => seriesRef.current.update(p));
            updater(newCandle);
        }
    }, [interval]);

    const applyQuoteToChart = useCallback((price) => {
        if (!Number.isFinite(price)) return;
        if (lastAppliedQuotePriceRef.current === price) return;

        lastAppliedQuotePriceRef.current = price;
        mergePriceIntoLastCandle(price);
    }, [mergePriceIntoLastCandle]);


    //fetching Historical data
    useEffect(() => {
        const getData = async () => {
            setHistoryLoaded(false);
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
            setHistoryLoaded(true);
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
                background: '#000000',
                textColor: 'rgba(255, 255, 255, 0.9)',
                panes: {
                    separatorColor: 'rgba(255, 255, 255, 0.2)'
                }
            },
            grid: {
                vertLines: { color: '#ffffff0c' },
                horzLines: { color: '#ffffff0c' },
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

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',   // Green for increasing price
            downColor: '#ef5350', // Red for decreasing price
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        }, 0);

        chartRef.current = chart; // Saving the chart object accross rerender
        seriesRef.current = series;
        // Create a buffered updater for the main candlestick series to avoid
        // blocking the main thread when many quote updates arrive.
        bufferedCandleUpdaterRef.current = makeBufferedSeriesUpdater(series);
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
        const price = Number(currentData.currentPrice);
        if (!Number.isFinite(price) || price === 0) return;

        latestQuotePriceRef.current = price;
        if (seriesRef.current && historyLoaded) {
            applyQuoteToChart(price);
        }
    }, [applyQuoteToChart, currentData, historyLoaded]);

    useEffect(() => {
        if (!seriesRef.current || !historyLoaded) return;

        const pendingPrice = latestQuotePriceRef.current;
        if (pendingPrice === null) return;

        applyQuoteToChart(pendingPrice);
    }, [applyQuoteToChart, historyLoaded]);


    //Render indicators whenever indicatorList changes
    useEffect(() => {

        const pm = paneManagerRef.current;
        const chart = chartRef.current;
        if (!pm || !chart || !historyLoaded || !ohlcvDataRef.current.length) return;

        // Properly unsubscribe old indicators before clearing
        for (const [key, entry] of indicatorHandlersRef.current.entries()) {
            try {
                wsManager.unsubscriber("indicator", ticker, entry.handler, entry.properties);
            } catch (error) {
                console.warn("Failed to unsubscribe during indicator update", key, error);
            }
        }

        // Clear all old indicators and subscriptions before rendering new ones
        pm.removeAll();
        indicatorHandlersRef.current.clear();

        if (indicatorList.length !== 0) {

            const priceByTime = new Map(ohlcvDataRef.current.map((candle) => [candle.time, candle]));

            for (let i in indicatorList) {
                const item = indicatorList[i];
                const id = makeIndicatorId(item);
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

                        // subscribe to real-time updates for this indicator
                        {
                            // Build clean properties for subscription (exclude data, colors, etc.)
                            const props = {
                                ticker,
                                interval,
                                indicator: indicatorType,
                                timeperiod: item.timeperiod
                            };
                            const bufferedLineUpdate = makeBufferedSeriesUpdater(line);
                            const handler = (msg) => {
                                if (!msg) return;
                                const time = getIndicatorTime(msg);
                                const value = getIndicatorValue(msg, indicatorType);
                                if (value === undefined || value === null) return;
                                bufferedLineUpdate({ time, value: Number(value) });
                            };
                            const idKey = id;
                            indicatorHandlersRef.current.set(idKey, { handler, properties: props });
                            wsManager.subscriber("indicator", ticker, handler, props);
                        }
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

                        hist.applyOptions({
                            priceLineColor: '#FFFFFF',
                            priceLineStyle: LineStyle.Dotted
                        });

                        chart.priceScale('volume-overlay').applyOptions({
                            scaleMargins: {
                                top: 0.85,    // Volume starts at 80% from the top
                                bottom: 0.01, // Tiny gap at the very bottom
                            },
                        });

                        const finalData = item.data.map((quote) => {
                            const time = (new Date(quote.Date)).getTime() / 1000;
                            const candle = priceByTime.get(time);
                            const color = quote.color;
                            return {
                                time,
                                value: Number(quote['Volume']),
                                color: color
                            };
                        })
                        hist.setData(finalData);
                        {
                            const props = {
                                ticker,
                                interval,
                                indicator: "VOL"
                            };
                            const bufferedHistUpdate = makeBufferedSeriesUpdater(hist);
                            const handler = (msg) => {
                                if (!msg) return;
                                const time = getIndicatorTime(msg);
                                const value = getIndicatorValue(msg, "Volume");
                                const color = getIndicatorValue(msg, "color");
                                if (value === undefined || value === null || value === 0) return;
                                bufferedHistUpdate({ time, value: Number(value), color: color });
                            };
                            const idKey = id;
                            indicatorHandlersRef.current.set(idKey, { handler, properties: props });
                            wsManager.subscriber("indicator", ticker, handler, props);
                        }
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
                        {
                            const props = {
                                ticker,
                                interval,
                                indicator: "RSI",
                                timeperiod: item.timeperiod
                            };
                            const bufferedRsiUpdate = makeBufferedSeriesUpdater(rsiLine);
                            const handler = (msg) => {
                                if (!msg) return;
                                const time = getIndicatorTime(msg);
                                const value = getIndicatorValue(msg, "RSI");
                                if (value === undefined || value === null) return;
                                bufferedRsiUpdate({ time, value: Number(value) });
                            };
                            const idKey = id;
                            indicatorHandlersRef.current.set(idKey, { handler, properties: props });
                            wsManager.subscriber("indicator", ticker, handler, props);
                        }
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
                        {
                            const props = {
                                ticker,
                                interval,
                                indicator: "OBV"
                            };
                            const bufferedObvUpdate = makeBufferedSeriesUpdater(OBVLine);
                            const handler = (msg) => {
                                if (!msg) return;
                                const time = getIndicatorTime(msg);
                                const value = getIndicatorValue(msg, "OBV");
                                if (value === undefined || value === null) return;
                                bufferedObvUpdate({ time, value: Number(value) });
                            };
                            const idKey = id;
                            indicatorHandlersRef.current.set(idKey, { handler, properties: props });
                            wsManager.subscriber("indicator", ticker, handler, props);
                        }
                        break;
                    }

                    case "BBAND": {
                        // const {DOWN , MIDDLE , UP} = item.data;
                        const DOWN = item.data["DOWN"];
                        const MIDDLE = item.data["MIDDLE"];
                        const UP = item.data["UP"];

                        // Validate BBAND data structure
                        if (!Array.isArray(DOWN) || !Array.isArray(MIDDLE) || !Array.isArray(UP)) {
                            console.error("BBAND data structure invalid. DOWN/MIDDLE/UP must be arrays.", {
                                DOWN: DOWN ? `array(${DOWN.length})` : typeof DOWN,
                                MIDDLE: MIDDLE ? `array(${MIDDLE.length})` : typeof MIDDLE,
                                UP: UP ? `array(${UP.length})` : typeof UP,
                                fullData: item.data
                            });
                            break; // Skip this indicator
                        }

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

                        // setData calls - chart library handles rendering efficiently
                        lineUp.setData(finalDataUp);
                        lineMiddle.setData(finalDataMiddle);
                        lineDown.setData(finalDataDown);

                        {
                            const props = {
                                ticker,
                                interval,
                                indicator: "BBAND",
                                timeperiod: item.timeperiod,
                                stdUp: item.stdUp,
                                stdDown: item.stdDown,
                                matype: item.matype
                            };
                            const bufferedUp = makeBufferedSeriesUpdater(lineUp);
                            const bufferedMiddle = makeBufferedSeriesUpdater(lineMiddle);
                            const bufferedDown = makeBufferedSeriesUpdater(lineDown);
                            let bbandMessageCount = 0;
                            const handler = (msg) => {
                                if (!msg) return;
                                bbandMessageCount++;
                                if (bbandMessageCount <= 3) { // Log first 3 messages
                                    console.debug("BBAND message #" + bbandMessageCount, {
                                        msgKeys: Object.keys(msg),
                                        UP: msg.UP ? (Array.isArray(msg.UP) ? `array[${msg.UP.length}]` : `${typeof msg.UP} - ${JSON.stringify(msg.UP).substring(0, 100)}`) : undefined,
                                        MIDDLE: msg.MIDDLE ? (Array.isArray(msg.MIDDLE) ? `array[${msg.MIDDLE.length}]` : `${typeof msg.MIDDLE} - ${JSON.stringify(msg.MIDDLE).substring(0, 100)}`) : undefined,
                                        DOWN: msg.DOWN ? (Array.isArray(msg.DOWN) ? `array[${msg.DOWN.length}]` : `${typeof msg.DOWN} - ${JSON.stringify(msg.DOWN).substring(0, 100)}`) : undefined,
                                    });
                                }
                                const time = getIndicatorTime(msg);
                                // Handle both array and single-object message formats
                                if (Array.isArray(msg.UP)) {
                                    // Array format - take the latest value
                                    if (msg.UP.length > 0) bufferedUp({ time, value: Number(msg.UP[msg.UP.length - 1].BBAND_UP) });
                                    if (msg.MIDDLE.length > 0) bufferedMiddle({ time, value: Number(msg.MIDDLE[msg.MIDDLE.length - 1].BBAND_MIDDLE) });
                                    if (msg.DOWN.length > 0) bufferedDown({ time, value: Number(msg.DOWN[msg.DOWN.length - 1].BBAND_DOWN) });
                                } else {
                                    // Object format - use directly
                                    if (msg.UP?.BBAND_UP !== undefined) bufferedUp({ time, value: Number(msg.UP.BBAND_UP) });
                                    if (msg.MIDDLE?.BBAND_MIDDLE !== undefined) bufferedMiddle({ time, value: Number(msg.MIDDLE.BBAND_MIDDLE) });
                                    if (msg.DOWN?.BBAND_DOWN !== undefined) bufferedDown({ time, value: Number(msg.DOWN.BBAND_DOWN) });
                                }
                            };
                            const idKey = id;
                            indicatorHandlersRef.current.set(idKey, { handler, properties: props });
                            wsManager.subscriber("indicator", ticker, handler, props);
                        }

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
                                { type: 'line', options: { color: item.slowLineColor, lineWidth: 1, priceScaleId: stochScaleId } },
                                { type: 'line', options: { color: item.fastLineColor, lineWidth: 1, priceScaleId: stochScaleId } }
                            ])

                            // setData calls - chart library handles rendering efficiently
                            slowD.setData(finalSlowd);
                            slowK.setData(finalSlowk);
                            {
                                const props = {
                                    ticker,
                                    interval,
                                    indicator: "STOCH",
                                    fastkPeriod: item.fastkPeriod,
                                    slowkPeriod: item.slowkPeriod,
                                    slowkMaType: item.slowkMaType,
                                    slowdPeriod: item.slowdPeriod,
                                    slowdMaType: item.slowdMaType
                                };
                                const bufferedSlowD = makeBufferedSeriesUpdater(slowD);
                                const bufferedSlowK = makeBufferedSeriesUpdater(slowK);
                                const handler = (msg) => {
                                    if (!msg) return;
                                    const time = getIndicatorTime(msg);
                                    if (msg.SLOWD?.SLOWD !== undefined) bufferedSlowD({ time, value: Number(msg.SLOWD.SLOWD) });
                                    if (msg.SLOWK?.SLOWK !== undefined) bufferedSlowK({ time, value: Number(msg.SLOWK.SLOWK) });
                                };
                                const idKey = id;
                                indicatorHandlersRef.current.set(idKey, { handler, properties: props });
                                wsManager.subscriber("indicator", ticker, handler, props);
                            }
                            break;
                        }

                    default:
                        console.log("INDICATOR NOT FOUND");
                }
            }
            // Keep indicator handlers active for real-time updates.
            // Cleanup will be handled when indicators are explicitly removed or
            // when the component unmounts.
        }
    }, [indicatorList, setIndicatorList, ticker, interval, historyLoaded]);

    // When the ticker or interval changes, fully clear any active indicators
    // and reset the shared `IndicatorsList` so indicators reload with fresh data.
    useEffect(() => {
        if (!paneManagerRef.current && indicatorHandlersRef.current.size === 0) return;

        // Unsubscribe all active indicator handlers first
        for (const [key, entry] of indicatorHandlersRef.current.entries()) {
            try {
                wsManager.unsubscriber("indicator", ticker, entry.handler, entry.properties);
            } catch (error) {
                console.warn("Failed to unsubscribe during ticker/interval change", key, error);
            }
        }

        // Remove all panes and clear handler map
        try {
            paneManagerRef.current?.removeAll();
        } catch (e) {
            console.warn("Failed to remove panes on ticker/interval change", e);
        }
        indicatorHandlersRef.current.clear();

        // Clear the shared indicator list so UI and chart start fresh
        try {
            setIndicatorList([]);
        } catch (e) {
            console.warn("Failed to reset indicator list", e);
        }

        // Note: individual indicator subscribers will be recreated if the user
        // re-add indicators via the UI; cleanup effect below handles any
        // remaining unsubscribes on unmount.
    }, [ticker, interval, setIndicatorList]);

    useEffect(() => {
        const activeIndicatorHandlers = indicatorHandlersRef.current;
        return () => {
            // Cleanup runs when the chart instance is torn down or the ticker/interval
            // changes, so old subscriptions do not keep receiving websocket messages.
            for (const [key, entry] of activeIndicatorHandlers.entries()) {
                try {
                    wsManager.unsubscriber("indicator", ticker, entry.handler, entry.properties);
                } catch (error) {
                    console.warn("Failed to unsubscribe indicator during cleanup", key, error);
                }
            }
            activeIndicatorHandlers.clear();
        };
    }, [ticker, interval]);


    return (
        <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }}></div>
    );

}