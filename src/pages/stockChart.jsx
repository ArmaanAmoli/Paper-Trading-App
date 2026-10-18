import { useParams } from 'react-router-dom';
import CandleStickChartComponent from '../Components/Charts/candlestick.jsx';
import Watchlist from '../Components/watchlist.jsx';
import OrderForm from '../Components/orderForm.jsx';
import IndicatorsDropdown from '../Components/IndicatorsDropdown.jsx';
import { useEffect, useRef, useState } from 'react';
import { IndicatorsList } from '../Context/context.js';
import MovingAvgPopUp from '../Components/IndicatorPopUps/movingAvgPopUp.jsx';
import RSIPopUp from '../Components/IndicatorPopUps/rsiPopUp.jsx';
import BBandPopUp from '../Components/IndicatorPopUps/boilingerBandPopUp.jsx';
import VolumePopUp from '../Components/IndicatorPopUps/volumeIndicatorPopUp.jsx';
import StochasticOscillatorPopUp from '../Components/IndicatorPopUps/stochasticOscillatorPopUp.jsx';
import "./styles/chartTradePage.css";

function ClickOutside({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);
  return <div className="absolute z-1000" ref={ref}>{children}</div>;
}

export default function StockMainChart() {
  const [activeTab, setActiveTab] = useState('order'); // 'order' | 'watchlist'
  const { ticker } = useParams();

  const [interval, setInterval] = useState('1h');

  // Indicators pop up states
  const [maPopUp, setMaPopUp] = useState(false);
  const [rsiPopUp, setRsiPopUp] = useState(false);
  const [bBandPopUp, setBBandPopUp] = useState(false);
  const [volPopup, setVolPopUp] = useState(false);
  const [stocasticPopUp, setStocasticPopUp] = useState(false);

  // Listen for indicator popup open events from the dropdown
  useEffect(() => {
    const handleOpenPopup = (e) => {
      const { indicator, interval: eventInterval } = e.detail;
      if (eventInterval !== interval) return;
      
      switch (indicator) {
        case 'SMA':
        case 'EMA':
          setMaPopUp(true);
          break;
        case 'RSI':
          setRsiPopUp(true);
          break;
        case 'BBAND':
          setBBandPopUp(true);
          break;
        case 'VOL':
          setVolPopUp(true);
          break;
        case 'STOCH':
          setStocasticPopUp(true);
          break;
      }
    };

    window.addEventListener('open-indicator-popup', handleOpenPopup);
    return () => window.removeEventListener('open-indicator-popup', handleOpenPopup);
  }, [interval]);

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

      {/* Indicator Popups (unchanged, still portal to body or overlay) */}
      {maPopUp && <ClickOutside onClose={() => setMaPopUp(false)}><MovingAvgPopUp Interval={interval} /></ClickOutside>}
      {rsiPopUp && <ClickOutside onClose={() => setRsiPopUp(false)}><RSIPopUp Interval={interval} /></ClickOutside>}
      {bBandPopUp && <ClickOutside onClose={() => setBBandPopUp(false)}><BBandPopUp Interval={interval} /></ClickOutside>}
      {volPopup && <ClickOutside onClose={() => setVolPopUp(false)}><VolumePopUp Interval={interval} /></ClickOutside>}
      {stocasticPopUp && <ClickOutside onClose={() => setStocasticPopUp(false)}><StochasticOscillatorPopUp Interval={interval} /></ClickOutside>}
    </div>
  );
}