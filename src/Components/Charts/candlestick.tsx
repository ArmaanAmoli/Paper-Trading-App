import {
  createChart,
  CandlestickSeries,
  LineStyle,
  CrosshairMode,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
  type SingleValueData,
} from 'lightweight-charts';
import { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { fetchData, fetchIndicatorData } from '../../services/dataRequesterForCharts';
import { IndicatorsList } from '../../Context/context';
import { useTicker } from '../../hooks/useTicker';
import { PaneManager } from '../../lib/paneManager';
import { wsManager, type WebSocketMessage } from '../../lib/wsManager';
import ChartPriceMarkers from './ChartPriceMarkers';
import type { IndicatorListItem } from '../../Context/context';

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

interface CandleData extends SingleValueData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

interface HistogramData extends SingleValueData {
  time: UTCTimestamp;
  value: number;
  color?: string;
}

interface LineData extends SingleValueData {
  time: UTCTimestamp;
  value: number;
}

const INTERVAL_SECONDS: Record<string, number> = {
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

export interface StopLossData {
  _id: string;
  symbol: string;
  price: number;
  startDate: string;
  type: 'buy' | 'sell';
  qty: number;
}

interface CandleStickChartComponentProps {
  ticker: string | undefined;
  interval: string;
  period: string;
  stopLosses: StopLossData[];
  onStopLossChange: () => void;
}

// Helper to batch rapid series updates onto the next animation frame.
const makeBufferedSeriesUpdater = <T extends SingleValueData>(series: ISeriesApi<SeriesType>) => {
  let scheduled = false;
  let lastPoint: T | null = null;
  return (point: T) => {
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
const makeIndicatorId = (item: IndicatorListItem): string => {
  const getString = (val: unknown): string => {
    if (val === undefined || val === null) return '';
    // Only stringify primitives; objects would produce '[object Object]'
    if (typeof val === 'object') return '';
    // val is now known to be a primitive (string, number, boolean, symbol, bigint)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(val);
  };
  // Extract values first to satisfy TypeScript template literal type checking
  const timeperiod = item['timeperiod'];
  const matype = item['matype'];
  const fastkPeriod = item['fastkPeriod'];
  const slowkPeriod = item['slowkPeriod'];
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${item.ticker}::${item.interval}::${item.indicator}::${getString(timeperiod)}::${getString(matype)}::${getString(fastkPeriod)}::${getString(slowkPeriod)}`;
};

export default function CandleStickChartComponent({
  ticker,
  interval,
  period,
  stopLosses,
  onStopLossChange,
}: CandleStickChartComponentProps) {
  const currentData = useTicker('quote', ticker ?? '');
  const indicatorContext = useContext(IndicatorsList);
  const [indicatorList, setIndicatorList] = indicatorContext ? [indicatorContext.indicatorList, indicatorContext.setIndicatorList] : [[] as IndicatorListItem[], () => {}];

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const bufferedCandleUpdaterRef = useRef<((point: CandleData) => void) | null>(null);
  const [data, setData] = useState<CandleData[]>([]);

  const paneManagerRef = useRef<PaneManager | null>(null);
  const ohlcvDataRef = useRef<CandleData[]>([]);
  const indicatorHandlersRef = useRef<Map<string, { handler: (data: WebSocketMessage) => void; properties: Record<string, unknown> }>>(new Map());
  const latestQuotePriceRef = useRef<number | null>(null);
  const lastAppliedQuotePriceRef = useRef<number | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const getIndicatorTime = (msg: WebSocketMessage): UTCTimestamp => {
    if (msg && typeof msg === 'object' && 'Date' in msg && typeof msg.Date === 'string') {
      return (new Date(msg.Date).getTime() / 1000) as UTCTimestamp;
    }
    if (ohlcvDataRef.current && ohlcvDataRef.current.length > 0) {
      return ohlcvDataRef.current[ohlcvDataRef.current.length - 1].time;
    }
    return Math.floor(Date.now() / 1000) as UTCTimestamp;
  };

  const getIndicatorValue = (msg: WebSocketMessage, fieldName: string): number | null => {
    if (msg === null || msg === undefined) return null;
    if (typeof msg === 'number') return msg;
    if (typeof msg !== 'object') return Number(msg);
    if (fieldName && fieldName in msg && typeof msg[fieldName as keyof typeof msg] === 'number') {
      return msg[fieldName as keyof typeof msg] as number;
    }
    if ('value' in msg && typeof msg.value === 'number') return msg.value;
    return null;
  };

  const getIndicatorStringValue = (msg: WebSocketMessage, fieldName: string): string | null => {
    if (msg === null || msg === undefined) return null;
    if (typeof msg === 'string') return msg;
    if (typeof msg !== 'object') return String(msg);
    if (fieldName && fieldName in msg && typeof msg[fieldName as keyof typeof msg] === 'string') {
      return msg[fieldName as keyof typeof msg] as string;
    }
    return null;
  };

  const mergePriceIntoLastCandle = useCallback(
    (price: number) => {
      if (!Number.isFinite(price)) return;
      if (!seriesRef.current || !ohlcvDataRef.current.length) return;

      const intervalSec = INTERVAL_SECONDS[interval];
      const lastCandle = ohlcvDataRef.current[ohlcvDataRef.current.length - 1];
      const nextCandleTime = lastCandle.time + intervalSec;

      if (nextCandleTime <= lastCandle.time) return;

      if (Math.floor(Date.now() / 1000) < nextCandleTime) {
        const updated: CandleData = {
          ...lastCandle,
          high: Math.max(lastCandle.high, price),
          low: Math.min(lastCandle.low, price),
          close: price,
          value: price,
        };
        ohlcvDataRef.current[ohlcvDataRef.current.length - 1] = updated;
        const updater = bufferedCandleUpdaterRef.current ?? ((p: CandleData) => seriesRef.current?.update(p));
        updater(updated);
      } else {
        const newCandle: CandleData = {
          time: nextCandleTime as UTCTimestamp,
          open: lastCandle.close,
          high: price,
          low: price,
          close: price,
          value: price,
        };
        ohlcvDataRef.current.push(newCandle);
        const updater = bufferedCandleUpdaterRef.current ?? ((p: CandleData) => seriesRef.current?.update(p));
        updater(newCandle);
      }
    },
    [interval],
  );

  const applyQuoteToChart = useCallback(
    (price: number) => {
      if (!Number.isFinite(price)) return;
      if (lastAppliedQuotePriceRef.current === price) return;
      lastAppliedQuotePriceRef.current = price;
      mergePriceIntoLastCandle(price);
    },
    [mergePriceIntoLastCandle],
  );

  // Fetching Historical data
  useEffect(() => {
    if (!ticker) return;
    const getData = async () => {
      setHistoryLoaded(false);
      const rawData = await fetchData(ticker, interval, period);
      const finalData: CandleData[] = rawData.map((quote) => ({
        time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
        open: quote.Open,
        high: quote.High,
        low: quote.Low,
        close: quote.Close,
        value: quote.Close,
      }));
      ohlcvDataRef.current = finalData;
      setData(finalData);
      setHistoryLoaded(true);
    };
    void getData();
  }, [ticker, interval, period]);

  // Creating the chart
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
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
        tickMarkFormatter: (time: UTCTimestamp) =>
          new Date(time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_COLORS.crosshairColor,
          style: 2, // dashed
          width: 1,
          labelBackgroundColor: CHART_COLORS.crosshairLabelBg,
        } as const,
        horzLine: {
          color: CHART_COLORS.crosshairColor,
          style: 2, // dashed
          width: 1,
          labelBackgroundColor: CHART_COLORS.crosshairLabelBg,
        } as const,
      },
      // priceScale is configured per-series, not at chart level
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
        priceScaleId: 'right',
      },
      0,
    );

    // Configure price scale on the series
    series.priceScale().applyOptions({
      borderColor: CHART_COLORS.axisBorderColor,
      borderVisible: true,
      autoScale: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    bufferedCandleUpdaterRef.current = makeBufferedSeriesUpdater<CandleData>(series);
    paneManagerRef.current = new PaneManager(chart);

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
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
        wsManager.unsubscriber('indicator', ticker ?? '', entry.handler, entry.properties);
      } catch (error) {
        console.warn('Failed to unsubscribe during indicator update', key, error);
      }
    }

    // Clear all old indicators and subscriptions before rendering new ones
    pm.removeAll();
    indicatorHandlersRef.current.clear();

    if (indicatorList.length !== 0) {
      // Use an async IIFE to handle async indicator data fetching
      void (async () => {
        for (let i = 0; i < indicatorList.length; i++) {
          const item = indicatorList[i];
          const id = makeIndicatorId(item);
          if (pm.has(id)) continue;

          const indicatorType = item.indicator;
          console.log(id);

          switch (indicatorType) {
            case 'SMA':
            case 'EMA': {
              const lineColor = (item.lineColor as string) || CHART_COLORS.indicatorColors.blue;
              const [line] = pm.add(
                id,
                [{ type: 'line', options: { color: lineColor, lineWidth: 2 } }],
                true,
              );

              const indicatorData = await fetchIndicatorData({
                ticker,
                interval,
                indicator: indicatorType,
                period,
                timeperiod: item.timeperiod,
              });

              const finalData: LineData[] = (indicatorData[indicatorType] as Array<{ Date: string; [key: string]: unknown }> | undefined)?.map((quote) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote[indicatorType]),
              })) ?? [];
              line.setData(finalData);

              const props = {
                ticker,
                interval,
                indicator: indicatorType,
                timeperiod: item.timeperiod,
              };
              const bufferedLineUpdate = makeBufferedSeriesUpdater<LineData>(line);
              const handler = (msg: WebSocketMessage) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                const value = getIndicatorValue(msg, indicatorType);
                if (value === undefined || value === null) return;
                bufferedLineUpdate({ time, value: Number(value) });
              };
              indicatorHandlersRef.current.set(id, { handler, properties: props });
              wsManager.subscriber('indicator', ticker ?? '', handler, props);
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

              const volData = await fetchIndicatorData({ ticker, interval, indicator: 'VOL', period });
              const finalData: HistogramData[] = (volData.VOL as Array<{ Date: string; Volume: number; color: string }> | undefined)?.map((quote) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote.Volume),
                color: quote.color,
              })) ?? [];
              hist.setData(finalData);

              const props = { ticker, interval, indicator: 'VOL' };
              const bufferedHistUpdate = makeBufferedSeriesUpdater<HistogramData>(hist);
              const handler = (msg: WebSocketMessage) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                const value = getIndicatorValue(msg, 'Volume');
                const color = getIndicatorStringValue(msg, 'color');
                if (value === undefined || value === null || value === 0) return;
                bufferedHistUpdate({ time, value: Number(value), color: color ?? '' });
              };
              indicatorHandlersRef.current.set(id, { handler, properties: props });
              wsManager.subscriber('indicator', ticker ?? '', handler, props);
              break;
            }

            case 'RSI': {
              const overBrought = {
                price: item.overBroughtLevel as number,
                color: CHART_COLORS.indicatorColors.muted,
                lineWidth: 1 as const,
                lineStyle: 2 as const,
                axisLabelVisible: true,
                title: 'Overbought',
              };

              const overSold = {
                price: item.overSoldLevel as number,
                color: CHART_COLORS.indicatorColors.muted,
                lineWidth: 1 as const,
                lineStyle: 2 as const,
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

              const rsiData = await fetchIndicatorData({ ticker, interval, indicator: 'RSI', period, timeperiod: item.timeperiod });
              const finalData: LineData[] = (rsiData.RSI as Array<{ Date: string; RSI: number }> | undefined)?.map((quote) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote.RSI),
              })) ?? [];
              rsiLine.setData(finalData);

              const props = { ticker, interval, indicator: 'RSI', timeperiod: item.timeperiod };
              const bufferedRsiUpdate = makeBufferedSeriesUpdater<LineData>(rsiLine);
              const handler = (msg: WebSocketMessage) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                const value = getIndicatorValue(msg, 'RSI');
                if (value === undefined || value === null) return;
                bufferedRsiUpdate({ time, value: Number(value) });
              };
              indicatorHandlersRef.current.set(id, { handler, properties: props });
              wsManager.subscriber('indicator', ticker ?? '', handler, props);
              break;
            }

            case 'OBV': {
              const [OBVLine] = pm.add(id, [
                {
                  type: 'line',
                  options: {
                    color: (item.lineColor as string) || CHART_COLORS.indicatorColors.primary,
                    lineWidth: 1,
                    priceFormat: { type: 'volume', precision: 2, minMove: 0.01 },
                    priceScaleId: `obv-${id}`,
                  },
                },
              ]);
              const obvData = await fetchIndicatorData({ ticker, interval, indicator: 'OBV', period });
              const finalData: LineData[] = (obvData.OBV as Array<{ Date: string; OBV: number }> | undefined)?.map((quote) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote.OBV),
              })) ?? [];
              OBVLine.setData(finalData);
              const props = { ticker, interval, indicator: 'OBV' };
              const bufferedObvUpdate = makeBufferedSeriesUpdater<LineData>(OBVLine);
              const handler = (msg: WebSocketMessage) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                const value = getIndicatorValue(msg, 'OBV');
                if (value === undefined || value === null) return;
                bufferedObvUpdate({ time, value: Number(value) });
              };
              indicatorHandlersRef.current.set(id, { handler, properties: props });
              wsManager.subscriber('indicator', ticker ?? '', handler, props);
              break;
            }

            case 'BBAND': {
              const bbandData = await fetchIndicatorData({
                ticker,
                interval,
                indicator: 'BBAND',
                period,
                timeperiod: item.timeperiod,
                stdUp: item.stdUp,
                stdDown: item.stdDown,
                matype: item.matype,
              });

              const DOWN = bbandData.DOWN;
              const MIDDLE = bbandData.MIDDLE;
              const UP = bbandData.UP;

              if (!Array.isArray(DOWN) || !Array.isArray(MIDDLE) || !Array.isArray(UP)) {
                console.error('BBAND data structure invalid.', {
                  DOWN,
                  MIDDLE,
                  UP,
                  fullData: bbandData,
                });
                break;
              }

              const finalDataDown: LineData[] = DOWN.map((quote: { Date: string; BBAND_DOWN: number }) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote.BBAND_DOWN),
              }));
              const finalDataMiddle: LineData[] = MIDDLE.map((quote: { Date: string; BBAND_MIDDLE: number }) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote.BBAND_MIDDLE),
              }));
              const finalDataUp: LineData[] = UP.map((quote: { Date: string; BBAND_UP: number }) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote.BBAND_UP),
              }));

              const upColor = (item.upLineColor as string) || CHART_COLORS.indicatorColors.muted;
              const middleColor = (item.lineColor as string) || CHART_COLORS.indicatorColors.blue;
              const downColor = (item.downLineColor as string) || CHART_COLORS.indicatorColors.muted;

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

              const props = {
                ticker,
                interval,
                indicator: 'BBAND',
                timeperiod: item.timeperiod,
                stdUp: item.stdUp,
                stdDown: item.stdDown,
                matype: item.matype,
              };
              const bufferedUp = makeBufferedSeriesUpdater<LineData>(lineUp);
              const bufferedMiddle = makeBufferedSeriesUpdater<LineData>(lineMiddle);
              const bufferedDown = makeBufferedSeriesUpdater<LineData>(lineDown);
              let bbandMessageCount = 0;
              const handler = (msg: WebSocketMessage) => {
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
                const msgAny = msg as Record<string, unknown>;
                const up = msgAny.UP as Array<{ BBAND_UP: number }> | { BBAND_UP: number } | undefined;
                const middle = msgAny.MIDDLE as Array<{ BBAND_MIDDLE: number }> | { BBAND_MIDDLE: number } | undefined;
                const down = msgAny.DOWN as Array<{ BBAND_DOWN: number }> | { BBAND_DOWN: number } | undefined;
                if (Array.isArray(up)) {
                  if (up.length > 0)
                    bufferedUp({ time, value: Number(up[up.length - 1].BBAND_UP) });
                  if (Array.isArray(middle) && middle.length > 0)
                    bufferedMiddle({
                      time,
                      value: Number(middle[middle.length - 1].BBAND_MIDDLE),
                    });
                  if (Array.isArray(down) && down.length > 0)
                    bufferedDown({ time, value: Number(down[down.length - 1].BBAND_DOWN) });
                } else {
                  if (up?.BBAND_UP !== undefined)
                    bufferedUp({ time, value: Number(up.BBAND_UP) });
                  if (middle !== undefined && typeof middle === 'object' && 'BBAND_MIDDLE' in middle)
                    bufferedMiddle({ time, value: Number(middle.BBAND_MIDDLE) });
                  if (down !== undefined && typeof down === 'object' && 'BBAND_DOWN' in down)
                    bufferedDown({ time, value: Number(down.BBAND_DOWN) });
                }
              };
              indicatorHandlersRef.current.set(id, { handler, properties: props });
              wsManager.subscriber('indicator', ticker ?? '', handler, props);
              break;
            }

            case 'STOCH': {
              const stochData = await fetchIndicatorData({
                ticker,
                interval,
                indicator: 'STOCH',
                period,
                fastkPeriod: item.fastkPeriod,
                slowkPeriod: item.slowkPeriod,
                slowkMaType: item.slowkMaType,
                slowdPeriod: item.slowdPeriod,
                slowdMaType: item.slowdMaType,
              });

              const SLOWD = stochData.SLOWD as Array<{ Date: string; SLOWD: number }> | { SLOWD: number } | undefined;
              const SLOWK = stochData.SLOWK as Array<{ Date: string; SLOWK: number }> | { SLOWK: number } | undefined;
              const stochScaleId = `stoch-${id}`;
              const finalSlowd: LineData[] = Array.isArray(SLOWD) ? SLOWD.map((quote) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote.SLOWD),
              })) : [];
              const finalSlowk: LineData[] = Array.isArray(SLOWK) ? SLOWK.map((quote) => ({
                time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
                value: Number(quote.SLOWK),
              })) : [];

              const slowLineColor = (item.slowLineColor as string) || CHART_COLORS.indicatorColors.secondary;
              const fastLineColor = (item.fastLineColor as string) || CHART_COLORS.indicatorColors.primary;

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
              const bufferedSlowD = makeBufferedSeriesUpdater<LineData>(slowD);
              const bufferedSlowK = makeBufferedSeriesUpdater<LineData>(slowK);
              const handler = (msg: WebSocketMessage) => {
                if (!msg) return;
                const time = getIndicatorTime(msg);
                const msgAny = msg as Record<string, unknown>;
                const slowDVal = msgAny.SLOWD as { SLOWD: number } | undefined;
                const slowKVal = msgAny.SLOWK as { SLOWK: number } | undefined;
                if (slowDVal?.SLOWD !== undefined)
                  bufferedSlowD({ time, value: Number(slowDVal.SLOWD) });
                if (slowKVal?.SLOWK !== undefined)
                  bufferedSlowK({ time, value: Number(slowKVal.SLOWK) });
              };
              indicatorHandlersRef.current.set(id, { handler, properties: props });
              wsManager.subscriber('indicator', ticker ?? '', handler, props);
              break;
            }

            default:
              console.log('INDICATOR NOT FOUND');
          }
        }
      })();
    }
  }, [indicatorList, setIndicatorList, ticker, interval, period, historyLoaded]);

  // When the ticker or interval changes, fully clear any active indicators
  useEffect(() => {
    if (!paneManagerRef.current && indicatorHandlersRef.current.size === 0) return;

    for (const [key, entry] of indicatorHandlersRef.current.entries()) {
      try {
        wsManager.unsubscriber('indicator', ticker ?? '', entry.handler, entry.properties);
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
          wsManager.unsubscriber('indicator', ticker ?? '', entry.handler, entry.properties);
        } catch (error) {
          console.warn('Failed to unsubscribe indicator during cleanup', key, error);
        }
      }
      activeIndicatorHandlers.clear();
    };
  }, [ticker, interval]);

  // Plot area rect state
  const [plotAreaRect, setPlotAreaRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    priceAxisWidth: number;
    timeAxisHeight: number;
  } | null>(null);

  // Overlay container ref for React-managed overlay sibling
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  // Price to coordinate function for ChartPriceMarkers
  const priceToCoordinate = useCallback((price: number) => {
    if (!chartRef.current || !seriesRef.current) return null;
    // In lightweight-charts v5, priceToCoordinate is on the series, not the price scale
    return seriesRef.current.priceToCoordinate(price);
  }, []);

  // Get visible price range for ChartPriceMarkers
  const getVisiblePriceRange = useCallback(() => {
    if (!chartRef.current) return null;
    const priceScale = chartRef.current.priceScale('right');
    // Try multiple possible method names for lightweight-charts v5
    const visibleRange = priceScale.getVisibleRange?.();
    if (visibleRange && typeof visibleRange === 'object' && 'minValue' in visibleRange && 'maxValue' in visibleRange) {
      return { minValue: visibleRange.minValue as number, maxValue: visibleRange.maxValue as number };
    }
    return null;
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
    // Note: priceScale.subscribeVisibleChange may not exist in the API
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange?.(handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      timeScale.unsubscribeVisibleLogicalRangeChange?.(handleResize);
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
        priceToCoordinate={priceToCoordinate}
        getVisiblePriceRange={getVisiblePriceRange}
        plotAreaRect={plotAreaRect}
        stopLosses={stopLosses}
        onStopLossChange={onStopLossChange}
      />
    </div>
  );
}
