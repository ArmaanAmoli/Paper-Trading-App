import { useParams } from 'react-router-dom';
import CandleStickChartComponent from '../Components/Charts/candlestick';
import Watchlist from '../Components/Watchlist';
import OrderForm from '../Components/OrderForm';
import IndicatorsDropdown from '../Components/IndicatorsDropdown';
import { useEffect, useState, useCallback } from 'react';
import IndicatorModal from '../Components/IndicatorPopUps/IndicatorModal';
import { indicatorConfigs } from '../Components/IndicatorPopUps/indicatorConfigs';
import ChartErrorBoundary from '../Components/ChartErrorBoundary';
import { fetchActiveStopLosses } from '../services/api';
import './styles/chartTradePage.css';
import type { IndicatorConfig } from '../Components/IndicatorPopUps/indicatorConfigs';
import type { StopLossData } from '../Components/Charts/candlestick';

export default function StockMainChart() {
  const [activeTab, setActiveTab] = useState<'order' | 'watchlist'>('order');
  const { ticker } = useParams<{ ticker: string }>();

  const [interval, setInterval] = useState('1h');

  // Single modal state
  const [modalConfig, setModalConfig] = useState<IndicatorConfig | null>(null);

  // Stop losses state (lifted from ChartPriceMarkers)
  const [stopLosses, setStopLosses] = useState<StopLossData[]>([]);

  // Listen for indicator popup open events from the dropdown
  useEffect(() => {
    const handleOpenPopup = (e: CustomEvent<{ indicator: string; interval: string }>) => {
      const { indicator, interval: eventInterval } = e.detail;
      if (eventInterval !== interval) return;

      // Map indicator IDs to config keys
      const configMap: Record<string, string> = {
        SMA: 'SMA',
        EMA: 'SMA',
        RSI: 'RSI',
        BBAND: 'BBAND',
        VOL: 'VOL',
        STOCH: 'STOCH',
      };

      const configKey = configMap[indicator];
      if (configKey && indicatorConfigs[configKey]) {
        const config = indicatorConfigs[configKey];
        // Convert IndicatorConfig to IndicatorConfig (same)
        setModalConfig({
          indicatorId: config.indicatorId,
          title: config.title,
          submitLabel: config.submitLabel,
          fields: config.fields,
        });
      }
    };

    window.addEventListener('open-indicator-popup', handleOpenPopup as EventListener);
    return () => window.removeEventListener('open-indicator-popup', handleOpenPopup as EventListener);
  }, [interval]);

  const closeModal = () => setModalConfig(null);

  // Refresh stop losses for current symbol
  const refreshStopLosses = useCallback(async () => {
    try {
      const data = await fetchActiveStopLosses(ticker);
      setStopLosses(data || []);
    } catch (err) {
      console.warn('Failed to refresh stop losses:', err);
    }
  }, [ticker]);

  // Refresh all data (positions + stop losses) - called after successful mutations
  const refreshAllData = useCallback(async () => {
    // Refresh stop losses immediately
    await refreshStopLosses();
    // Note: positions are refreshed via UserEquityContext's 10s interval.
    // We could also trigger an immediate refresh by calling the context setter,
    // but the interval is frequent enough (10s) and the backend updates are instant.
    // If needed, we could expose a refresh function from UserEquityContext.
  }, [refreshStopLosses]);

  // Fetch stop losses on symbol change
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await fetchActiveStopLosses(ticker);
        if (mounted) setStopLosses(data || []);
      } catch (err) {
        console.warn('Failed to refresh stop losses:', err);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [ticker]);

  const intervals = ['1m', '2m', '5m', '15m', '30m', '1h', '90m', '1d', '5d', '1wk', '1mo', '3mo'];

  return (
    <div className="chart-trade-page">
      <div className="chart-trade-cards">
        {/* CHART CARD (left) */}
        <div className="chart-card">
          {/* Toolbar */}
          <div className="chart-toolbar">
            <div className="interval-group" role="group" aria-label="Time intervals">
              {intervals.map((intv) => (
                <button
                  key={intv}
                  type="button"
                  className={`interval-btn ${interval === intv ? 'active' : ''}`}
                  onClick={() => setInterval(intv)}
                  aria-pressed={interval === intv}
                >
                  {intv}
                </button>
              ))}
            </div>
            <div className="toolbar-divider" aria-hidden="true" />
            <IndicatorsDropdown interval={interval} />
          </div>

          {/* Chart Area */}
          <div className="chart-area">
            <ChartErrorBoundary>
              <CandleStickChartComponent
                ticker={ticker}
                interval={interval}
                period="max"
                key={`${ticker}-${interval}`}
                stopLosses={stopLosses}
                onStopLossChange={refreshAllData}
              />
            </ChartErrorBoundary>
          </div>

          {/* Indicator Modal - rendered inside chart card for centering */}
          {modalConfig && (
            <IndicatorModal
              isOpen={true}
              onClose={closeModal}
              indicatorConfig={modalConfig}
              interval={interval}
            />
          )}
        </div>

        {/* SIDE PANEL CARD (right) */}
        <div className="side-panel-card">
          {/* Tab Bar */}
          <div className="side-panel-tabs" role="tablist" aria-label="Side panel sections">
            <button
              role="tab"
              id="tab-order"
              className={`side-panel-tab ${activeTab === 'order' ? 'active' : ''}`}
              aria-selected={activeTab === 'order'}
              aria-controls="panel-order"
              tabIndex={activeTab === 'order' ? 0 : -1}
              onClick={() => setActiveTab('order')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setActiveTab('watchlist');
                  document.getElementById('tab-watchlist')?.focus();
                }
              }}
            >
              Order
            </button>
            <button
              role="tab"
              id="tab-watchlist"
              className={`side-panel-tab ${activeTab === 'watchlist' ? 'active' : ''}`}
              aria-selected={activeTab === 'watchlist'}
              aria-controls="panel-watchlist"
              tabIndex={activeTab === 'watchlist' ? 0 : -1}
              onClick={() => setActiveTab('watchlist')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setActiveTab('order');
                  document.getElementById('tab-order')?.focus();
                }
              }}
            >
              Watchlist
            </button>
          </div>

          {/* Tab Panels */}
          <div className="side-panel-content">
            <div
              role="tabpanel"
              id="panel-order"
              aria-labelledby="tab-order"
              hidden={activeTab !== 'order'}
              className={activeTab === 'order' ? '' : 'hidden'}
            >
              <OrderForm onOrderPlaced={refreshAllData} />
            </div>
            <div
              role="tabpanel"
              id="panel-watchlist"
              aria-labelledby="tab-watchlist"
              hidden={activeTab !== 'watchlist'}
              className={activeTab === 'watchlist' ? '' : 'hidden'}
            >
              <Watchlist />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
