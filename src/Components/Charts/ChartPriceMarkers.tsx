import { useEffect, useRef, useContext, useMemo } from 'react';
import { UserEquityContext } from '../../Context/context';
import { cancelStopLoss } from '../../services/api';
import { useTicker } from '../../hooks/useTicker';
import { formatNumber, formatSignedNumber, formatPercent } from '../../lib/formatters';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import type { StopLossData } from './candlestick';

function toFiniteNumber(val: unknown): number {
  if (val === null || val === undefined) return NaN;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return Number.isFinite(num) ? num : NaN;
}

function normalizeSymbol(sym: unknown): string {
  if (sym === null || sym === undefined) return '';
  // Only stringify primitives to avoid '[object Object]'
  if (typeof sym === 'object') return '';
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(sym)
    .trim()
    .toUpperCase();
}

function roundPrice(price: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(price * factor) / factor;
}

interface PositionData {
  symbol: string;
  shares: number;
  avgPrice: number;
  positionType: 'long' | 'short';
  lastUpdated: string;
}

interface PnLData {
  Pnl: string;
  pChange: string;
}

interface StopLossItem {
  _id?: string;
  id?: string;
  symbol?: string;
  ticker?: string;
  instrument?: string;
  asset?: string;
  price?: number | string;
  triggerPrice?: number | string;
  trigger_price?: number | string;
  qty?: number | string;
  quantity?: number | string;
  type?: 'buy' | 'sell';
}

// Simplified marker types using type assertions
interface BaseMarker {
  id: string;
  kind: 'position' | 'stopLoss';
  price: number;
  qty: number;
  side: 'LONG' | 'SHORT';
  label: string;
  symbol: string;
  color: string;
  isPosition: boolean;
  pnl?: number;
  pnlPercent?: number;
  count?: number;
  displayPrice?: string;
  stopLossIds?: string[];
  title?: string;
}

// With Y coordinate for rendering
interface MarkerWithY extends BaseMarker {
  y: number;
  pinned?: 'top' | 'bottom';
  axisLabelVisible: boolean;
}

// Type guards for narrowing
function isPositionMarker(marker: MarkerWithY): boolean {
  return marker.kind === 'position';
}

function isStopLossMarker(marker: MarkerWithY): boolean {
  return marker.kind === 'stopLoss';
}

// Single source of truth: builds markers for the current symbol only
function buildMarkersForSymbol(
  symbol: string,
  position: PositionData | undefined,
  stopLosses: StopLossItem[],
  prices: Record<string, PnLData>,
  livePrice: number,
): BaseMarker[] {
  const currentSymbol = normalizeSymbol(symbol);
  const markers: BaseMarker[] = [];

  // Position marker (already filtered by assetList.find)
  if (position) {
    const avgEntry = toFiniteNumber(position.avgPrice);
    const shares = toFiniteNumber(position.shares);

    if (Number.isFinite(avgEntry) && Number.isFinite(shares) && shares !== 0) {
      const qty = Math.abs(shares);
      const side = shares > 0 ? 'LONG' : 'SHORT';
      const pnlValue = prices?.[symbol]?.Pnl;
      const pnlPercent = prices?.[symbol]?.pChange;

      let computedPnl = toFiniteNumber(pnlValue);
      let computedPnlPercent = toFiniteNumber(pnlPercent);

      if (!Number.isFinite(computedPnl) && livePrice > 0 && avgEntry > 0) {
        const isLong = side === 'LONG';
        computedPnl = isLong ? (livePrice - avgEntry) * qty : (avgEntry - livePrice) * qty;
        computedPnlPercent = (computedPnl / (avgEntry * qty)) * 100;
      }

      markers.push({
        id: 'position-' + symbol,
        kind: 'position',
        price: avgEntry,
        qty,
        side,
        label: side,
        pnl: Number.isFinite(computedPnl) ? computedPnl : 0,
        pnlPercent: Number.isFinite(computedPnlPercent) ? computedPnlPercent : 0,
        symbol: currentSymbol,
        color: side === 'LONG' ? '#A1A1A1' : '#E5484D',
        isPosition: true,
      });
    }
  }

  // Stop losses: FAIL-CLOSED filter by symbol
  const validStopLosses: (StopLossItem & { _normalizedSymbol: string; _id: string; _price: number; _qty: number; _type: 'buy' | 'sell' })[] = [];
  for (const sl of stopLosses || []) {
    const slSymbol = normalizeSymbol(sl.symbol ?? sl.ticker ?? sl.instrument ?? sl.asset);

    if (!slSymbol) {
      console.warn('[ChartPriceMarkers] Dropping stop loss without readable symbol:', sl);
      continue;
    }

    if (slSymbol !== currentSymbol) {
      // Different symbol - drop silently (fail-closed)
      continue;
    }

    const price = toFiniteNumber(sl.price ?? sl.triggerPrice ?? sl.trigger_price);
    const qty = toFiniteNumber(sl.qty ?? sl.quantity);
    const id = sl._id ?? sl.id;
    const type = sl.type;

    if (!Number.isFinite(price) || !Number.isFinite(qty) || !id) {
      console.warn('[ChartPriceMarkers] Skipping invalid stop loss:', sl);
      continue;
    }

    validStopLosses.push({
      ...sl,
      _normalizedSymbol: slSymbol,
      _id: id,
      _price: price,
      _qty: qty,
      _type: type ?? 'sell',
    });
  }

  // Merge stop losses at same price (same symbol, same side)
  const groups = new Map<string, { price: number; side: 'LONG' | 'SHORT'; items: typeof validStopLosses; ids: string[]; totalQty: number }>();
  for (const sl of validStopLosses) {
    const roundedPrice = roundPrice(sl._price, 2);
    const side = sl._type === 'buy' ? 'LONG' : 'SHORT';
    const key = `${side}:${roundedPrice}`;

    if (!groups.has(key)) {
      groups.set(key, { price: roundedPrice, side, items: [], ids: [], totalQty: 0 });
    }
    const group = groups.get(key);
    if (!group) continue;
    group.items.push(sl);
    group.ids.push(sl._id);
    group.totalQty += sl._qty;
  }

  // Create merged markers
  for (const [, group] of groups) {
    const count = group.items.length;
    const displayPrice = formatNumber(group.price);

    markers.push({
      id: `stop:${currentSymbol}:${group.price}`, // stable id for price line reconciliation
      kind: 'stopLoss',
      price: group.price,
      qty: group.totalQty,
      side: group.side,
      label: count > 1 ? `Stop Loss ×${count}` : 'Stop Loss',
      stopLossIds: group.ids, // array of original ids for cancel
      symbol: currentSymbol,
      color: '#E5484D',
      isPosition: false,
      count,
      displayPrice,
      title:
        count > 1
          ? `${count} stop losses at ${displayPrice}: ${group.items.map((s) => formatNumber(s._qty)).join(' + ')}`
          : `Stop loss for ${currentSymbol} at ${displayPrice} (qty ${formatNumber(group.totalQty)})`,
    });
  }

  return markers;
}

function computeYCoordinate(
  price: number,
  priceToCoordinate: ((price: number) => number | null) | undefined,
  getVisiblePriceRange: (() => { minValue: number; maxValue: number } | null) | undefined,
  plotAreaRect: { height: number } | null,
): number | null {
  if (!priceToCoordinate || !plotAreaRect) return null;

  const y = priceToCoordinate(price);
  if (y !== null && y !== undefined && Number.isFinite(y)) {
    return y;
  }

  const visibleRange = getVisiblePriceRange ? getVisiblePriceRange() : null;
  if (!visibleRange) return null;

  const minValue = visibleRange.minValue;
  const maxValue = visibleRange.maxValue;
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return null;

  const priceRange = maxValue - minValue;
  if (priceRange === 0) return null;

  const ratio = (maxValue - price) / priceRange;
  const computedY = ratio * plotAreaRect.height;

  return Number.isFinite(computedY) ? computedY : null;
}

interface LabelProps {
  marker: MarkerWithY;
  formatSignedNumber: (val: number) => string;
  formatPercent: (val: number) => string;
  onCancel: () => void;
}

function Label({ marker, formatSignedNumber, formatPercent, onCancel }: LabelProps) {
  if (isPositionMarker(marker)) {
    const pnl = marker.pnl ?? 0;
    const borderColor =
      pnl > 0
        ? 'rgba(50, 145, 255, 0.5)'
        : pnl < 0
          ? 'rgba(229, 72, 77, 0.5)'
          : '#3D3D3D';

    return (
      <div
        key={marker.id}
        className="price-marker-label position-label"
        style={{
          position: 'absolute',
          left: '12px',
          top: `${marker.y - 11}px`,
          height: '22px',
          borderRadius: '4px',
          border: `1px solid ${borderColor}`,
          background: '#1A1B1E',
          fontSize: '12px',
          fontFamily:
            '"Geist Mono", "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, monospace',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'auto',
          zIndex: 101,
          transition: 'opacity 150ms ease',
        }}
      >
        <span
          style={{ color: '#EDEDED', padding: '0 8px', borderRight: `1px solid ${borderColor}` }}
        >
          {marker.qty}
        </span>
        <span style={{ padding: '0 8px', borderRight: `1px solid ${borderColor}` }}>
          {marker.side}
        </span>
        <span
          style={{
            color: pnl > 0 ? '#3291FF' : pnl < 0 ? '#FF6369' : '#707070',
            padding: '0 8px',
          }}
        >
          {formatSignedNumber(pnl)} ({formatPercent(marker.pnlPercent ?? 0)})
        </span>
      </div>
    );
  } else {
    return (
      <div
        key={marker.id}
        className="price-marker-label stoploss-label"
        style={{
          position: 'absolute',
          left: '12px',
          top: `${marker.y - 11}px`,
          height: '22px',
          borderRadius: '4px',
          border: '1px solid rgba(229, 72, 77, 0.6)',
          background: '#1A1B1E',
          fontSize: '12px',
          fontFamily:
            '"Geist Mono", "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, monospace',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'auto',
          zIndex: 101,
          transition: 'opacity 150ms ease',
        }}
        title={marker.title}
      >
        <span style={{ padding: '0 8px', borderRight: '1px solid rgba(229, 72, 77, 0.6)' }}>
          {marker.qty}
        </span>
        <span style={{ padding: '0 8px', borderRight: '1px solid rgba(229, 72, 77, 0.6)' }}>
          {marker.label}
        </span>
        <button
          className="cancel-stoploss-chart-btn"
          style={{
            width: '24px',
            height: '22px',
            border: 'none',
            background: 'transparent',
            color: '#FF6369',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0 4px 4px 0',
            fontSize: '14px',
            fontWeight: '600',
          }}
          aria-label={`Cancel ${marker.label} for ${marker.symbol} at ${marker.displayPrice}`}
          onClick={onCancel}
        >
          ✕
        </button>
      </div>
    );
  }
}

interface ChartPriceMarkersProps {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<SeriesType> | null>;
  ticker: string | undefined;
  priceToCoordinate: ((price: number) => number | null) | undefined;
  getVisiblePriceRange: (() => { minValue: number; maxValue: number } | null) | undefined;
  plotAreaRect: { height: number; width: number } | null;
  stopLosses: StopLossData[];
  onStopLossChange: () => void;
}

export default function ChartPriceMarkers({
  chartRef,
  seriesRef,
  ticker,
  priceToCoordinate,
  getVisiblePriceRange,
  plotAreaRect,
  stopLosses,
  onStopLossChange,
}: ChartPriceMarkersProps) {
  const context = useContext(UserEquityContext);
  const quoteData = useTicker('quote', ticker ?? '');
  const livePrice = toFiniteNumber(quoteData?.currentPrice);

  const priceLinesRef = useRef<Map<string, { price: number; remove: () => void }>>(new Map());
  const currentSymbolRef = useRef(normalizeSymbol(ticker ?? ''));

  // Extract context values for stable useMemo dependencies
  const portfolio = useMemo(() => context?.portfolio?.[0] ?? [], [context?.portfolio]);
  const pnl = useMemo(() => context?.pnl?.[0] ?? {}, [context?.pnl]);

  // Update ref when ticker changes (for race condition guard)
  useEffect(() => {
    currentSymbolRef.current = normalizeSymbol(ticker ?? '');
  }, [ticker]);

  // Build markers using single source of truth - FAIL-CLOSED
  const baseMarkers = useMemo(() => {
    if (!ticker || !plotAreaRect) return [];

    const assetList = portfolio;
    const prices = pnl;
    const currentSymbol = normalizeSymbol(ticker);
    const position = assetList?.find((item) => normalizeSymbol(item.symbol) === currentSymbol);

    return buildMarkersForSymbol(currentSymbol, position, stopLosses, prices, livePrice);
  }, [ticker, portfolio, pnl, stopLosses, livePrice, plotAreaRect]);

  // Add Y coordinates and handle stacking/pinning
  const markersWithY = useMemo(() => {
    if (!baseMarkers.length) return [];

    const markersWithY = baseMarkers
      .map((marker) => {
        const y = computeYCoordinate(
          marker.price,
          priceToCoordinate,
          getVisiblePriceRange,
          plotAreaRect,
        );
        if (y === null || y === undefined || !Number.isFinite(y)) return null;
        return { ...marker, y };
      })
      .filter((m): m is MarkerWithY => m !== null);

    // Dev-only safety net
    if (typeof window !== 'undefined' && (window as Window & { __DEV__?: boolean }).__DEV__) {
      for (const m of markersWithY) {
        if (m.symbol !== normalizeSymbol(ticker ?? '')) {
          console.error(
            '[ChartPriceMarkers] DEV CHECK FAILED: marker symbol mismatch',
            m.symbol,
            'vs',
            ticker,
          );
        }
      }
    }

    // Sort by Y for stacking
    const sortedMarkers = [...markersWithY].sort((a, b) => a.y - b.y);
    let lastY = -Infinity;
    const stackedMarkers = sortedMarkers.map((marker) => {
      if (marker.y - lastY < 24 && lastY !== -Infinity) {
        const newY = lastY + 24;
        lastY = newY;
        return { ...marker, y: newY };
      } else {
        lastY = marker.y;
        return marker;
      }
    });

    // Pin off-screen markers
    return stackedMarkers.map((marker) => {
      if (marker.y < 0) {
        return { ...marker, y: 0, pinned: 'top' as const, axisLabelVisible: false };
      } else if (plotAreaRect && marker.y > plotAreaRect.height) {
        return {
          ...marker,
          y: plotAreaRect.height - 22,
          pinned: 'bottom' as const,
          axisLabelVisible: false,
        };
      }
      return { ...marker, axisLabelVisible: true };
    });
  }, [baseMarkers, plotAreaRect, priceToCoordinate, getVisiblePriceRange, ticker]);

  // Handle stop loss cancellation (merged or single)
  const handleCancelStopLoss = (marker: MarkerWithY) => {
    // Fail-closed: verify symbol matches current chart symbol
    if (marker.symbol !== normalizeSymbol(ticker ?? '')) {
      console.error('[ChartPriceMarkers] Symbol mismatch on cancel:', marker.symbol, 'vs', ticker);
      return;
    }

    const ids = isStopLossMarker(marker) ? (marker.stopLossIds ?? []) : [marker.id].filter(Boolean);
    const count = ids.length;
    const displayPrice = isStopLossMarker(marker) ? (marker.displayPrice ?? formatNumber(marker.price)) : formatNumber(marker.price);

    let confirmed = false;
    if (count > 1) {
      // Custom confirm for merged stop losses
      confirmed = window.confirm(
        `Cancel ${count} stop losses at ${displayPrice} for ${marker.symbol} (total quantity ${formatNumber(marker.qty)})?`,
      );
    } else {
      confirmed = window.confirm(`Cancel stop loss for ${marker.symbol} at ${displayPrice}?`);
    }
    if (!confirmed) return;

    // Cancel all, then refetch
    Promise.allSettled(ids.map((id: string) => cancelStopLoss(id)))
      .then((results) => {
        const failed = ids.filter((_id: string, i: number) => results[i].status === 'rejected');

        if (failed.length > 0) {
          alert(`Failed to cancel ${failed.length} of ${count} stop losses. Remaining will stay.`);
        }

        // Always refetch to get authoritative state
        if (onStopLossChange) onStopLossChange();
      })
      .catch((err) => alert('Failed to cancel: ' + (err instanceof Error ? err.message : String(err))));
  };

  // Sync price lines with markersWithY - runs on marker changes (including symbol change)
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const series = seriesRef.current;

    // Remove price lines for markers that no longer exist
    priceLinesRef.current.forEach((_priceLine, lineId) => {
      if (!markersWithY.find((m) => m.id === lineId)) {
        try {
          series.removePriceLine(_priceLine as unknown as ReturnType<typeof series.createPriceLine>);
        } catch {
          /* ignore */
        }
        priceLinesRef.current.delete(lineId);
      }
    });

    // Create or update price lines for current markers
    markersWithY.forEach((marker) => {
      if (!Number.isFinite(marker.price)) return;

      const priceLine = priceLinesRef.current.get(marker.id);

      if (!priceLine) {
        const isPosition = isPositionMarker(marker);
        try {
          const newPriceLine = series.createPriceLine({
            price: marker.price,
            color: isPosition ? '#A1A1A1' : '#E5484D',
            lineWidth: 1,
            lineStyle: isPosition ? 2 : 1,
            axisLabelVisible: marker.axisLabelVisible !== false, // hide when pinned off-screen
            title: '',
          });
          priceLinesRef.current.set(marker.id, newPriceLine as unknown as { price: number; remove: () => void });
        } catch (_err) {
          console.warn('[ChartPriceMarkers] Failed to create price line:', _err);
          return;
        }
      } else {
        try {
          (priceLine as unknown as { applyOptions: (opts: { price: number }) => void }).applyOptions({ price: marker.price });
        } catch {
          /* ignore */
        }
        try {
          (priceLine as unknown as { applyOptions: (opts: { axisLabelVisible: boolean }) => void }).applyOptions({ axisLabelVisible: marker.axisLabelVisible !== false });
        } catch {
          /* ignore */
        }
      }

      const isPosition = isPositionMarker(marker);
      try {
        (priceLine as unknown as { applyOptions: (opts: { color: string; lineWidth: number; lineStyle: number }) => void }).applyOptions({
          color: isPosition ? '#A1A1A1' : '#E5484D',
          lineWidth: 1,
          lineStyle: isPosition ? 2 : 1,
        });
      } catch {
        /* ignore */
      }

      try {
        (priceLine as unknown as { applyOptions: (opts: { axisLabelColor: string; axisLabelTextColor: string }) => void }).applyOptions({
          axisLabelColor: isPosition ? '#3D3D3D' : '#E5484D',
          axisLabelTextColor: '#FFFFFF',
        });
      } catch {
        /* ignore */
      }
    });

    // Dev-only count check
    if (typeof window !== 'undefined' && (window as Window & { __DEV__?: boolean }).__DEV__) {
      if (priceLinesRef.current.size !== markersWithY.length) {
        console.error(
          '[ChartPriceMarkers] DEV CHECK: price lines count mismatch',
          priceLinesRef.current.size,
          'vs markers',
          markersWithY.length,
        );
      }
    }
  }, [markersWithY, chartRef, seriesRef, ticker]); // ticker in deps ensures cleanup on symbol change

  // Cleanup ALL price lines on unmount
  useEffect(() => {
    const series = seriesRef.current;
    const lines = priceLinesRef.current;
    return () => {
      if (series) {
        try {
          lines.forEach((priceLine) => {
            try {
              series.removePriceLine(priceLine as unknown as ReturnType<typeof series.createPriceLine>);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      }
      lines.clear();
    };
  }, [seriesRef]);

  return (
    <div
      className="price-markers-overlay"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'visible',
      }}
    >
      {markersWithY.map((marker) => (
        <Label
          key={marker.id}
          marker={marker}
          formatSignedNumber={formatSignedNumber}
          formatPercent={formatPercent}
          onCancel={() => handleCancelStopLoss(marker)}
        />
      ))}
    </div>
  );
}
