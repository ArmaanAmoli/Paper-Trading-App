import { useParams } from 'react-router-dom';
import CandleStickChartComponent from './Charts/candlestick.jsx';
import { useLocation } from 'react-router-dom';
import Watchlist from './watchlist.jsx';
import "./styles/stockChart.css"
import { useState , useContext} from 'react';
import OrderForm from './orderForm.jsx';
import { IndicatorsList } from './context.js';
import { fetchIndicatorData } from './Charts/dataRequester.js';
export default function StockMainChart() {
    const [activePanel, setActivePanel] = useState('none');
    const { ticker } = useParams();
    const location = useLocation();
    const [indicatorList , setIndicatorList]= useContext(IndicatorsList);

    const [Interval, setInterval] = useState('1h');
    console.log(Interval);
    const toggleWatchlist = () => {
        setActivePanel(prev => prev === 'watchlist' ? 'none' : 'watchlist');
    }

    const toggleOrderForm = () => {
        setActivePanel(prev => prev === 'orderform' ? 'none' : 'orderform');
    }

    const ma = async (name)=>{
        let properties = {
            ticker:ticker,
            interval:Interval,
            period:'max',
            indicator:name,
            indicatorInterval:20 // <--------
        }
        
        const data = await fetchIndicatorData(properties);

        properties = {...properties , data:data};

        setIndicatorList([...indicatorList , properties]);
    }

    return (

        <div className="chart-page">
            <div className="Drawing-Sidebar">
                {/* 
                    Simple Moving Average 
                    Exponential Moving Average
                    Boillinger Bands
                    Relative Strengrh Index
                    Volume Weighted Average Price
                    On-Balance Volume
                    Volume
                    Stocastic Occilator
                */}
                <button className="indicator-button" onClick={()=>ma("SMA")} >SMA</button>
                <button className="indicator-button" onClick={()=>ma("EMA")} >EMA</button>
                <button className="indicator-button">BB</button>
                <button className="indicator-button">RSI</button>
                <button className="indicator-button text-xs">VWAP</button>
                <button className="indicator-button">OBV</button>
                <button className="indicator-button">VOL</button>
                <button className="indicator-button">SO</button>

            </div>
            <div className="Chart" key={location.pathname}>
                <div className="top-bar">
                    <button className='interval-button' style={{ backgroundColor: Interval === '1m' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('1m')}>1m</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '2m' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('2m')}>2m</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '5m' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('5m')}>5m</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '15m' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('15m')}>15m</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '30m' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('30m')}>30m</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '1h' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('1h')}>1h</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '90m' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('90m')}>90m</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '1d' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('1d')}>1d</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '5d' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('5d')}>5d</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '1wk' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('1wk')}>1wk</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '1mo' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('1mo')}>1mo</button>
                    <button className='interval-button' style={{ backgroundColor: Interval === '3mo' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.07)' }} onClick={() => setInterval('3mo')}>3mo</button>

                </div>
                <CandleStickChartComponent ticker={ticker} interval={Interval} period='max' key={Interval} />
            </div>

            {activePanel === 'watchlist' && <div className="watchlist"><Watchlist /></div>}
            {activePanel === 'orderform' && <div className="orderform"><OrderForm /></div>}


            <div className="Sidebar">
                <button className="Sidebar-Button" id="watchlist" onClick={toggleWatchlist}></button>
                <button className="Sidebar-Button" id="place-order" onClick={toggleOrderForm}></button>
            </div>

        </div>

    );
}