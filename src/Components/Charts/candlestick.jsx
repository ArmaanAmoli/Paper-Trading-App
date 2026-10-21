import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineStyle,
} from 'lightweight-charts';
import { useEffect, useRef, useState, useContext } from 'react';
import { fetchData } from '../../services/dataRequesterForCharts.js';
import { useCallback } from 'react';
import { CrosshairMode } from 'lightweight-charts';
import { IndicatorsList } from '../../Context/context.js';
import { useTicker } from '../../hooks/useTicker.js';
import { PaneManager } from '../../lib/paneManager.js';
import { wsManager } from '../../lib/wsManager.js';
import ChartPriceMarkers from './ChartPriceMarkers.jsx';

// Helper to batch rapid series updates onto the next animation frame.
const makeBufferedSeriesUpdater = (series) => {
  let scheduled = false;
  let lastPoint = null;
  return (point) => {
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
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '90m': 5400,
  '1d': 86400,
  '5d': 86400 * 5,
  '1wk': 86400 * 7,
};

// Chart color constants matching the design tokens
const CHART_COLORS = {
  background: '#141517', // --surface
  textColor: '#707070', // --text-muted
  gridColor: 'rgba(255,255,255,0.04)', // very faint grid
  axisBorderColor: '#26272B', // --border
  crosshairColor: '#3D3D3D', // --border-strong
  crosshairLabelBg: '#1A1B1E', // --surface-raised
  crosshairLabelText: '#EDEDED', // --text-primary
  upColor: '#0070F3', // --blue
  downColor: '#E5484D', // --red
  upColorHover: '#3291FF', // --blue hover
  downColorHover: '#FF6369', // --red hover
  volumeUpOpacity: 'rgba(0,112,243,0.4)', // 40% opacity
  volumeDownOpacity: 'rgba(229,72,77,0.4)', // 40% opacity
  lastPriceLineUp: '#3291FF', // lighter blue
  lastPriceLineDown: '#FF6369', // lighter red
  indicatorColors: {
    primary: '#EDEDED', // --text-primary
    secondary: '#A1A1A1', // --text-secondary
    muted: '#707070', // --text-muted
    blue: '#3291FF', // lighter blue for main indicator line
  },
};

export default function CandleStickChartComponent({
  ticker,
  interval,
  period,
  stopLosses,
  onStopLossChange,
}) {
  const currentData = useTicker('quote', ticker);
  const [indicatorList, setIndicatorList] = useContext(IndicatorsList);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const bufferedCandleUpdaterRef = useRef(null);
  const [data, SetData] = useState([]);

  const paneManagerRef = useRef(null);
  const ohlcvDataRef = useRef([]);
  const indicatorHandlersRef = useRef(new Map());
  const latestQuotePriceRef = useRef(null);
  const lastAppliedQuotePriceRef = useRef(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const getIndicatorTime = (msg) => {
    if (msg && typeof msg === 'object' && msg.Date) {
      return new Date(msg.Date).getTime() / 1000;
    }
    if (ohlcvDataRef.current && ohlcvDataRef.current.length > 0) {
      return ohlcvDataRef.current[ohlcvDataRef.current.length - 1].time;
    }
    return Math.floor(Date.now() / 1000);
  };

  const getIndicatorValue = (msg, fieldName) => {
    if (msg === null || msg === undefined) return null;
    if (typeof msg === 'number') return msg;
    if (typeof msg !== 'object') return Number(msg);
    if (fieldName && msg[fieldName] !== undefined) return Number(msg[fieldName]);
    if (msg.value !== undefined) return Number(msg.value);
    return null;
  };

  const mergePriceIntoLastCandle = useCallback(
    (price) => {
      if (!Number.isFinite(price)) return;
      if (!seriesRef.current || !ohlcvDataRef.current.length) return;

      const intervalSec = INTERVAL_SECONDS[interval];
      const lastCandle = ohlcvDataRef.current[ohlcvDataRef.current.length - 1];
      const nextCandleTime = lastCandle.time + intervalSec;

      if (nextCandleTime <= lastCandle.time) return;

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
    },
    [interval],
  );

  const applyQuoteToChart = useCallback(
    (price) => {
      if (!Number.isFinite(price)) return;
      if (lastAppliedQuotePriceRef.current === price) return;
      lastAppliedQuotePriceRef.current = price;
      mergePriceIntoLastCandle(price);
    },
    [mergePriceIntoLastCandle],
  );

  // Fetching Historical data
  useEffect(() => {
    const getData = async () => {
      setHistoryLoaded(false);
      const rawData = await fetchData(ticker, interval, period);
      const finalData = rawData.map((quote) => ({
        time: new Date(quote.Date).getTime() / 1000,
        open: quote.Open,
        high: quote.High,
        low: quote.Low,
        close: quote.Close,
      }));
      ohlcvDataRef.current = finalData;
      SetData(finalData);
      setHistoryLoaded(true);
    };
    getData();
  }, [ticker, interval, period]);

  // Creating the chart
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: CHART_COLORS.background,
        textColor: CHART_COLORS.textColor,
        fontSize: 11,
        fontFamily: `'Geist Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace`,
        panes: {
          separatorColor: CHART_COLORS.axisBorderColor,
        },
      },
      grid: {
        vertLines: { color: CHART_COLORS.gridColor, style: 0 },
        horzLines: { color: CHART_COLORS.gridColor, style: 0 },
      },
      timeScale: {
        borderColor: CHART_COLORS.axisBorderColor,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) =>
          new Date(time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_COLORS.crosshairColor,
          style: 2, // dashed
          width: 1,
          labelBackgroundColor: CHART_COLORS.crosshairLabelBg,
          labelTextColor: CHART_COLORS.crosshairLabelText,
        },
        horzLine: {
          color: CHART_COLORS.crosshairColor,
          style: 2, // dashed
          width: 1,
          labelBackgroundColor: CHART_COLORS.crosshairLabelBg,
          labelTextColor: CHART_COLORS.crosshairLabelText,
        },
      },
      priceScale: {
        borderColor: CHART_COLORS.axisBorderColor,
        borderVisible: true,
        autoScale: true,
      },
    });

    const series = chart.addSeries(
      CandlestickSeries,
      {
        upColor: CHART_COLORS.upColor,
        downColor: CHART_COLORS.downColor,
        borderVisible: false,
        wickUpColor: CHART_COLORS.upColor,
        wickDownColor: CHART_COLORS.downColor,
        borderUpColor: CHART_COLORS.upColor,
        borderDownColor: CHART_COLORS.downColor,
      },
      0,
    );

    chartRef.current = chart;
    seriesRef.current = series;
    bufferedCandleUpdaterRef.current = makeBufferedSeriesUpdater(series);
    paneManagerRef.current = new PaneManager(chart);

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
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

  // Websockets updating candlestick
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

  // Render indicators whenever indicatorList changes
  useEffect(() => {
    const pm = paneManagerRef.current;
    const chart = chartRef.current;
    if (!pm || !chart || !historyLoaded || !ohlcvDataRef.current.length) return;

    // Properly unsubscribe old indicators before clearing
    for (const [key, entry] of indicatorHandlersRef.current.entries()) {
      try {
        wsManager.unsubscriber('indicator', ticker, entry.handler, entry.properties);
      } catch (error) {
        console.warn('Failed to unsubscribe during indicator update', key, error);
      }
    }

    // Clear all old indicators and subscriptions before rendering new ones
    pm.removeAll();
    indicatorHandlersRef.current.clear();

    if (indicatorList.length !== 0) {
      for (let i in indicatorList) {
        const item = indicatorList[i];
        const id = makeIndicatorId(item);
        if (pm.has(id)) continue;

        const indicatorType = item.indicator;
        console.log(id);

        switch (indicatorType) {
          case 'SMA':
          case 'EMA': {
            const lineColor = item.lineColor || CHART_COLORS.indicatorColors.blue;
            const [line] = pm.add(
              id,
              [{ type: 'line', options: { color: lineColor, lineWidth: 2 } }],
              true,
            );

            const finalData = item.data.map((quote) => ({
              time: new Date(quote.Date).getTime() / 1000,
              value: Number(quote[indicatorType]),
            }));
            line.setData(finalData);

            {
              const props = {
                ticker,
                interval,
                indicator: indicatorType,
                timeperiod: item.timeperiod,
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
              wsManager.subscriber('indicator', ticker, handler, props);
            }
            break;
          }

          case 'VOL': {
            const [hist] = pm.add(
              id,
              [
                {
                  type: 'histogram',
                  options: {
                    priceFormat: { type: 'volume' },
                    priceScaleId: 'volume-overlay',
                  },
                },
              ],
              true,
            );

            hist.applyOptions({
              priceLineColor: CHART_COLORS.crosshairLabelText,
              priceLineStyle: LineStyle.Dotted,
            });

            chart.priceScale('volume-overlay').applyOptions({
              scaleMargins: {
                top: 0.85,
                bottom: 0.01,
              },
            });

            const finalData = item.data.map((quote) => {
              const time = new Date(quote.Date).getTime() / 1000;
              const color = quote.color;
              return {
                time,
                value: Number(quote['Volume']),
                color: color,
              };
            });
            hist.setData(finalData);
            {
              const props = { ticker, interval, indicator: 'VOL' };
              const bufferedHistUpdate = makeBufferedSeriesUpdater(hist);
              const handler = (msg) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                const value = getIndicatorValue(msg, 'Volume');
                const color = getIndicatorValue(msg, 'color');
                if (value === undefined || value === null || value === 0) return;
                bufferedHistUpdate({ time, value: Number(value), color: color });
              };
              const idKey = id;
              indicatorHandlersRef.current.set(idKey, { handler, properties: props });
              wsManager.subscriber('indicator', ticker, handler, props);
            }
            break;
          }

          case 'RSI': {
            const overBrought = {
              price: item.overBroughtLevel,
              color: CHART_COLORS.indicatorColors.muted,
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: 'Overbought',
            };

            const overSold = {
              price: item.overSoldLevel,
              color: CHART_COLORS.indicatorColors.muted,
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: 'Oversold',
            };

            const [rsiLine] = pm.add(id, [
              {
                type: 'line',
                options: {
                  color: CHART_COLORS.indicatorColors.secondary,
                  lineWidth: 1,
                  priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
                  priceScaleId: `rsi-scale-${id}`,
                  autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
                },
              },
            ]);

            rsiLine.createPriceLine(overBrought);
            rsiLine.createPriceLine(overSold);

            const finalData = item.data.map((quote) => ({
              time: new Date(quote.Date).getTime() / 1000,
              value: Number(quote[indicatorType]),
            }));
            rsiLine.setData(finalData);
            {
              const props = { ticker, interval, indicator: 'RSI', timeperiod: item.timeperiod };
              const bufferedRsiUpdate = makeBufferedSeriesUpdater(rsiLine);
              const handler = (msg) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                const value = getIndicatorValue(msg, 'RSI');
                if (value === undefined || value === null) return;
                bufferedRsiUpdate({ time, value: Number(value) });
              };
              const idKey = id;
              indicatorHandlersRef.current.set(idKey, { handler, properties: props });
              wsManager.subscriber('indicator', ticker, handler, props);
            }
            break;
          }

          case 'OBV': {
            const [OBVLine] = pm.add(id, [
              {
                type: 'line',
                options: {
                  color: item.lineColor || CHART_COLORS.indicatorColors.primary,
                  lineWidth: 1,
                  priceFormat: { type: 'volume', precision: 2, minMove: 0.01 },
                  priceScaleId: `obv-${id}`,
                },
              },
            ]);
            const finalData = item.data.map((quote) => ({
              time: new Date(quote.Date).getTime() / 1000,
              value: Number(quote[indicatorType]),
            }));
            OBVLine.setData(finalData);
            {
              const props = { ticker, interval, indicator: 'OBV' };
              const bufferedObvUpdate = makeBufferedSeriesUpdater(OBVLine);
              const handler = (msg) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                const value = getIndicatorValue(msg, 'OBV');
                if (value === undefined || value === null) return;
                bufferedObvUpdate({ time, value: Number(value) });
              };
              const idKey = id;
              indicatorHandlersRef.current.set(idKey, { handler, properties: props });
              wsManager.subscriber('indicator', ticker, handler, props);
            }
            break;
          }

          case 'BBAND': {
            const DOWN = item.data['DOWN'];
            const MIDDLE = item.data['MIDDLE'];
            const UP = item.data['UP'];

            if (!Array.isArray(DOWN) || !Array.isArray(MIDDLE) || !Array.isArray(UP)) {
              console.error('BBAND data structure invalid.', {
                DOWN,
                MIDDLE,
                UP,
                fullData: item.data,
              });
              break;
            }

            const finalDataDown = DOWN.map((quote) => ({
              time: new Date(quote.Date).getTime() / 1000,
              value: Number(quote.BBAND_DOWN),
            }));
            const finalDataMiddle = MIDDLE.map((quote) => ({
              time: new Date(quote.Date).getTime() / 1000,
              value: Number(quote.BBAND_MIDDLE),
            }));
            const finalDataUp = UP.map((quote) => ({
              time: new Date(quote.Date).getTime() / 1000,
              value: Number(quote.BBAND_UP),
            }));

            const upColor = item.upLineColor || CHART_COLORS.indicatorColors.muted;
            const middleColor = item.lineColor || CHART_COLORS.indicatorColors.blue;
            const downColor = item.downLineColor || CHART_COLORS.indicatorColors.muted;

            const [lineUp, lineMiddle, lineDown] = pm.add(
              id,
              [
                { type: 'line', options: { color: upColor, lineWidth: 1 } },
                { type: 'line', options: { color: middleColor, lineWidth: 2 } },
                { type: 'line', options: { color: downColor, lineWidth: 1 } },
              ],
              true,
            );

            lineUp.setData(finalDataUp);
            lineMiddle.setData(finalDataMiddle);
            lineDown.setData(finalDataDown);

            {
              const props = {
                ticker,
                interval,
                indicator: 'BBAND',
                timeperiod: item.timeperiod,
                stdUp: item.stdUp,
                stdDown: item.stdDown,
                matype: item.matype,
              };
              const bufferedUp = makeBufferedSeriesUpdater(lineUp);
              const bufferedMiddle = makeBufferedSeriesUpdater(lineMiddle);
              const bufferedDown = makeBufferedSeriesUpdater(lineDown);
              let bbandMessageCount = 0;
              const handler = (msg) => {
                if (!msg) return;
                bbandMessageCount++;
                if (bbandMessageCount <= 3) {
                  console.debug('BBAND message #' + bbandMessageCount, {
                    msgKeys: Object.keys(msg),
                    UP: msg.UP
                      ? Array.isArray(msg.UP)
                        ? `array[${msg.UP.length}]`
                        : `${typeof msg.UP}`
                      : undefined,
                    MIDDLE: msg.MIDDLE
                      ? Array.isArray(msg.MIDDLE)
                        ? `array[${msg.MIDDLE.length}]`
                        : `${typeof msg.MIDDLE}`
                      : undefined,
                    DOWN: msg.DOWN
                      ? Array.isArray(msg.DOWN)
                        ? `array[${msg.DOWN.length}]`
                        : `${typeof msg.DOWN}`
                      : undefined,
                  });
                }
                const time = getIndicatorTime(msg);
                if (Array.isArray(msg.UP)) {
                  if (msg.UP.length > 0)
                    bufferedUp({ time, value: Number(msg.UP[msg.UP.length - 1].BBAND_UP) });
                  if (msg.MIDDLE.length > 0)
                    bufferedMiddle({
                      time,
                      value: Number(msg.MIDDLE[msg.MIDDLE.length - 1].BBAND_MIDDLE),
                    });
                  if (msg.DOWN.length > 0)
                    bufferedDown({ time, value: Number(msg.DOWN[msg.DOWN.length - 1].BBAND_DOWN) });
                } else {
                  if (msg.UP?.BBAND_UP !== undefined)
                    bufferedUp({ time, value: Number(msg.UP.BBAND_UP) });
                  if (msg.MIDDLE?.BBAND_MIDDLE !== undefined)
                    bufferedMiddle({ time, value: Number(msg.MIDDLE.BBAND_MIDDLE) });
                  if (msg.DOWN?.BBAND_DOWN !== undefined)
                    bufferedDown({ time, value: Number(msg.DOWN.BBAND_DOWN) });
                }
              };
              const idKey = id;
              indicatorHandlersRef.current.set(idKey, { handler, properties: props });
              wsManager.subscriber('indicator', ticker, handler, props);
            }
            break;
          }

          case 'STOCH': {
            const SLOWD = item.data['SLOWD'];
            const SLOWK = item.data['SLOWK'];
            const stochScaleId = `stoch-${id}`;
            const finalSlowd = SLOWD.map((quote) => ({
              time: new Date(quote.Date).getTime() / 1000,
              value: Number(quote.SLOWD),
            }));
            const finalSlowk = SLOWK.map((quote) => ({
              time: new Date(quote.Date).getTime() / 1000,
              value: Number(quote.SLOWK),
            }));

            const slowLineColor = item.slowLineColor || CHART_COLORS.indicatorColors.secondary;
            const fastLineColor = item.fastLineColor || CHART_COLORS.indicatorColors.primary;

            const [slowD, slowK] = pm.add(id, [
              {
                type: 'line',
                options: { color: slowLineColor, lineWidth: 1, priceScaleId: stochScaleId },
              },
              {
                type: 'line',
                options: { color: fastLineColor, lineWidth: 1, priceScaleId: stochScaleId },
              },
            ]);

            slowD.setData(finalSlowd);
            slowK.setData(finalSlowk);
            {
              const props = {
                ticker,
                interval,
                indicator: 'STOCH',
                fastkPeriod: item.fastkPeriod,
                slowkPeriod: item.slowkPeriod,
                slowkMaType: item.slowkMaType,
                slowdPeriod: item.slowdPeriod,
                slowdMaType: item.slowdMaType,
              };
              const bufferedSlowD = makeBufferedSeriesUpdater(slowD);
              const bufferedSlowK = makeBufferedSeriesUpdater(slowK);
              const handler = (msg) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                if (msg.SLOWD?.SLOWD !== undefined)
                  bufferedSlowD({ time, value: Number(msg.SLOWD.SLOWD) });
                if (msg.SLOWK?.SLOWK !== undefined)
                  bufferedSlowK({ time, value: Number(msg.SLOWK.SLOWK) });
              };
              const idKey = id;
              indicatorHandlersRef.current.set(idKey, { handler, properties: props });
              wsManager.subscriber('indicator', ticker, handler, props);
            }
            break;
          }

          default:
            console.log('INDICATOR NOT FOUND');
        }
      }
    }
  }, [indicatorList, setIndicatorList, ticker, interval, historyLoaded]);

  // When the ticker or interval changes, fully clear any active indicators
  useEffect(() => {
    if (!paneManagerRef.current && indicatorHandlersRef.current.size === 0) return;

    for (const [key, entry] of indicatorHandlersRef.current.entries()) {
      try {
        wsManager.unsubscriber('indicator', ticker, entry.handler, entry.properties);
      } catch (error) {
        console.warn('Failed to unsubscribe during ticker/interval change', key, error);
      }
    }

    try {
      paneManagerRef.current?.removeAll();
    } catch (e) {
      console.warn('Failed to remove panes on ticker/interval change', e);
    }
    indicatorHandlersRef.current.clear();

    try {
      setIndicatorList([]);
    } catch (e) {
      console.warn('Failed to reset indicator list', e);
    }
  }, [ticker, interval, setIndicatorList]);

  useEffect(() => {
    const activeIndicatorHandlers = indicatorHandlersRef.current;
    return () => {
      for (const [key, entry] of activeIndicatorHandlers.entries()) {
        try {
          wsManager.unsubscriber('indicator', ticker, entry.handler, entry.properties);
        } catch (error) {
          console.warn('Failed to unsubscribe indicator during cleanup', key, error);
        }
      }
      activeIndicatorHandlers.clear();
    };
  }, [ticker, interval]);

  // Plot area rect state
  const [plotAreaRect, setPlotAreaRect] = useState(null);

  // Overlay container ref for React-managed overlay sibling
  const overlayContainerRef = useRef(null);

  // Price to coordinate function for ChartPriceMarkers
  const priceToCoordinate = useCallback((price) => {
    if (!chartRef.current || !seriesRef.current) return null;
    // In lightweight-charts v5, priceToCoordinate is on the series, not the price scale
    return seriesRef.current.priceToCoordinate(price);
  }, []);

  // Get visible price range for ChartPriceMarkers
  const getVisiblePriceRange = useCallback(() => {
    if (!chartRef.current) return null;
    const priceScale = chartRef.current.priceScale('right');
    // Try multiple possible method names for lightweight-charts v5
    const visibleRange =
      priceScale.getVisiblePriceRange?.() ??
      priceScale.visiblePriceRange?.() ??
      priceScale.getVisibleRange?.() ??
      priceScale.visibleRange;
    return visibleRange;
  }, []);

  // Compute plot area rect and update overlay container size
  const updatePlotAreaRect = useCallback(() => {
    if (!chartRef.current || !overlayContainerRef.current) return;
    const chart = chartRef.current;
    const priceScale = chart.priceScale('right');
    const timeScale = chart.timeScale();

    const priceAxisWidth = priceScale.width();
    const timeAxisHeight = timeScale.height();

    const chartElement = chart.chartElement();
    const rect = chartElement.getBoundingClientRect();

    // Plot area is the chart element minus price axis and time axis
    const plotLeft = 0;
    const plotTop = 0;
    const plotWidth = rect.width - priceAxisWidth;
    const plotHeight = rect.height - timeAxisHeight;

    setPlotAreaRect({
      left: plotLeft,
      top: plotTop,
      width: plotWidth,
      height: plotHeight,
      priceAxisWidth,
      timeAxisHeight,
    });

    // Update overlay container to cover plot area exactly
    if (overlayContainerRef.current) {
      overlayContainerRef.current.style.left = `${plotLeft}px`;
      overlayContainerRef.current.style.top = `${plotTop}px`;
      overlayContainerRef.current.style.width = `${plotWidth}px`;
      overlayContainerRef.current.style.height = `${plotHeight}px`;
    }
  }, []);

  // Subscribe to chart events for plot area updates
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    updatePlotAreaRect();

    const handleResize = () => updatePlotAreaRect();
    window.addEventListener('resize', handleResize);

    // Subscribe to chart events that affect plot area
    // In lightweight-charts v5:
    // - timeScale.subscribeVisibleLogicalRangeChange() for time scale visible logical range changes
    // - priceScale.subscribeVisibleChange() for price scale visible range changes
    // - chart.subscribeVisiblePriceScaleChange() for price scale visible changes (if available)
    const priceScale = chart.priceScale('right');
    const timeScale = chart.timeScale();
    priceScale.subscribeVisibleChange?.(handleResize);
    timeScale.subscribeVisibleLogicalRangeChange?.(handleResize);
    chart.subscribeVisiblePriceScaleChange?.(handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      priceScale.unsubscribeVisibleChange?.(handleResize);
      timeScale.unsubscribeVisibleLogicalRangeChange?.(handleResize);
      chart.unsubscribeVisiblePriceScaleChange?.(handleResize);
    };
  }, [updatePlotAreaRect]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: CHART_COLORS.background,
      }}
    >
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }}></div>
      <div
        ref={overlayContainerRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
          zIndex: 5,
          overflow: 'visible',
        }}
      />
      <ChartPriceMarkers
        chartRef={chartRef}
        seriesRef={seriesRef}
        ticker={ticker}
        interval={interval}
        priceToCoordinate={priceToCoordinate}
        getVisiblePriceRange={getVisiblePriceRange}
        plotAreaRect={plotAreaRect}
        setPlotAreaRect={setPlotAreaRect}
        stopLosses={stopLosses}
        onStopLossChange={onStopLossChange}
      />
    </div>
  );
}
