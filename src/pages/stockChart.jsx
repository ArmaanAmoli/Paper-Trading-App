import { useParams } from 'react-router-dom';
import CandleStickChartComponent from '../Components/Charts/candlestick.jsx';
import Watchlist from '../Components/watchlist.jsx';
import "./styles/stockChart.css"
import { useState } from 'react';
import OrderForm from '../Components/orderForm.jsx';
import { IndicatorsList } from '../Context/context.js';
import MovingAvgPopUp from '../Components/IndicatorPopUps/movingAvgPopUp.jsx';
import RSIPopUp from '../Components/IndicatorPopUps/rsiPopUp.jsx';
import BBandPopUp from '../Components/IndicatorPopUps/boilingerBandPopUp.jsx';
import VolumePopUp from '../Components/IndicatorPopUps/volumeIndicatorPopUp.jsx';
import StochasticOscillatorPopUp from '../Components/IndicatorPopUps/stochasticOscillatorPopUp.jsx';

export default function StockMainChart() {
    const [activePanel, setActivePanel] = useState('none');
    const { ticker } = useParams();

    const [Interval, setInterval] = useState('1h');
    console.log(Interval);
    const toggleWatchlist = () => {
        setActivePanel(prev => prev === 'watchlist' ? 'none' : 'watchlist');
    }

    const toggleOrderForm = () => {
        setActivePanel(prev => prev === 'orderform' ? 'none' : 'orderform');
    }

    //Indicators pop up states
    const [maPopUp, setMaPopUp] = useState(false);
    const [rsiPopUp , setRsiPopUp] = useState(false);
    const [bBandPopUp , setBBandPopUp] = useState(false);
    const [volPopup , setVolPopUp] = useState(false);
    const [stocasticPopUp , setStocasticPopUp] = useState(false);

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
                <button className="indicator-button" onClick={() => setMaPopUp(!maPopUp)} >MA</button>
                <button className="indicator-button" onClick={() => setBBandPopUp(!bBandPopUp)}>BB</button>
                <button className="indicator-button" onClick={() => setRsiPopUp(!rsiPopUp)}>RSI</button>
                <button className="indicator-button" onClick={() => setVolPopUp(!volPopup)}>VOL</button>
                <button className="indicator-button" onClick={() => setStocasticPopUp(!stocasticPopUp)}>SO</button>

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

            {maPopUp && <MovingAvgPopUp Interval={Interval}/>}
            {rsiPopUp && <RSIPopUp Interval={Interval}/>}
            {bBandPopUp && <BBandPopUp Interval={Interval}/>}
            {volPopup && <VolumePopUp Interval={Interval}/>}
            {stocasticPopUp && <StochasticOscillatorPopUp Interval={Interval}/>}

        </div>

    );
}