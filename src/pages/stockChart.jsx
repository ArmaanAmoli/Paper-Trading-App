import { useParams } from 'react-router-dom';
import CandleStickChartComponent from './Charts/candlestick';
import "./styles/stockChart.css"
import { useState } from 'react';
export default function StockMainChart() {
    const [activePanel, setActivePanel] = useState('none');
    const { ticker } = useParams();

    const toggleWatchlist = () => {
        setActivePanel(prev => prev === 'watchlist' ? 'none' : 'watchlist');
    }

    const toggleOrderForm = () => {
        setActivePanel(prev => prev === 'orderform' ? 'none' : 'orderform');
    }

    return (
        <>
            <div className="chart-page">
                <div className="Chart">
                    <CandleStickChartComponent ticker={ticker} interval='1h' period='max' />
                </div>
                {activePanel === 'watchlist' && <div className="watchlist">Watchlist Content</div>}
                {activePanel === 'orderform' && <div className="orderform">Order Form Content</div>}
                <div className="Sidebar">
                    <button className="Sidebar-Button" id="watchlist" onClick={toggleWatchlist}></button>
                    <button className="Sidebar-Button" id="place-order" onClick={toggleOrderForm}></button>
                </div>

            </div>
        </>
    );
}