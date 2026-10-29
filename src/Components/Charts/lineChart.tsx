import { createChart, ColorType, AreaSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { fetchData } from '../../services/dataRequesterForCharts';
import type { UTCTimestamp, SingleValueData } from 'lightweight-charts';

interface LineData extends SingleValueData {
  time: UTCTimestamp;
  value: number;
}

function transformData(apiResponse: Array<{ Date: string; Close: number }>): LineData[] {
  const finalData: LineData[] = apiResponse.map((quote) => ({
    time: new Date(quote.Date).getTime() / 1000 as UTCTimestamp,
    value: Number(quote.Close),
  }));
  return finalData;
}

interface LineChartProps {
  ticker: string;
}

export default function LineChart({ ticker }: LineChartProps) {
  const chartContainer = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [data, setData] = useState<LineData[]>([]);

  // Fetch data
  useEffect(() => {
    if (!ticker) return;

    const dataFromYahoo = async () => {
      try {
        const dataFromYahooJSON = await fetchData(ticker, '1d', '2y');

        // ensured data is an array
        if (Array.isArray(dataFromYahooJSON)) {
          const transformedData = transformData(dataFromYahooJSON);
          setData(transformedData);
        } else {
          console.error('API did not return an array:', dataFromYahooJSON);
        }
      } catch (err) {
        // Catch any network errors or non-200 responses from Axios
        console.error('Failed to fetch data:', err instanceof Error ? err.message : err);
      }
    };
    void dataFromYahoo();
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
        background: { type: ColorType.Solid, color: 'black' },
        textColor: 'white',
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#2962FF',
      topColor: '#2962ff7e',
      bottomColor: 'rgba(41, 98, 255, 0.28)',
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
    window.addEventListener('resize', handleResize);

    // Run once after mount so the chart picks up final flex/grid dimensions.
    requestAnimationFrame(handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
      <div ref={chartContainer} style={{ width: '100%', height: '100%', minHeight: '260px' }} />
    </>
  );
}
