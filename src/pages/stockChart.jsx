import { useParams } from 'react-router-dom';
import CandleStickChartComponent from '../Components/Charts/candlestick.jsx';
import Watchlist from '../Components/watchlist.jsx';
import OrderForm from '../Components/orderForm.jsx';
import IndicatorsDropdown from '../Components/IndicatorsDropdown.jsx';
import { useEffect, useRef, useState } from 'react';
import { IndicatorsList } from '../Context/context.js';
import IndicatorModal from '../Components/IndicatorPopUps/IndicatorModal.jsx';
import { indicatorConfigs } from '../Components/IndicatorPopUps/indicatorConfigs.js';
import "./styles/chartTradePage.css";

export default function StockMainChart() {
  const [activeTab, setActiveTab] = useState('order'); // 'order' | 'watchlist'
  const { ticker } = useParams();

  const [interval, setInterval] = useState('1h');

  // Single modal state
  const [modalConfig, setModalConfig] = useState(null);

  // Listen for indicator popup open events from the dropdown
  useEffect(() => {
    const handleOpenPopup = (e) => {
      const { indicator, interval: eventInterval } = e.detail;
      if (eventInterval !== interval) return;
      
      // Map indicator IDs to config keys
      const configMap = {
        SMA: 'SMA',
        EMA: 'SMA',
        RSI: 'RSI',
        BBAND: 'BBAND',
        VOL: 'VOL',
        STOCH: 'STOCH'
      };
      
      const configKey = configMap[indicator];
      if (configKey && indicatorConfigs[configKey]) {
        setModalConfig(indicatorConfigs[configKey]);
      }
    };

    window.addEventListener('open-indicator-popup', handleOpenPopup);
    return () => window.removeEventListener('open-indicator-popup', handleOpenPopup);
  }, [interval]);

  const closeModal = () => setModalConfig(null);

  // Reset active tab when ticker changes - use key on the component instead
  // This is handled by the key prop on the component in the parent route

  const intervals = [
    '1m', '2m', '5m', '15m', '30m', '1h', '90m', '1d', '5d', '1wk', '1mo', '3mo'
  ];

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
            <CandleStickChartComponent ticker={ticker} interval={interval} period='max' key={interval} />
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
              <OrderForm />
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