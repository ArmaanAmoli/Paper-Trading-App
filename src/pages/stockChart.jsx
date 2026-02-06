import {useParams} from 'react-router-dom';
import CandleStickChartComponent from './Charts/candlestick';
import "./styles/stockChart.css"
export default function StockMainChart(){
    const {ticker} = useParams();
    return(
        <>
            <div className="chart-page">
                <div className="Chart">
                    <CandleStickChartComponent ticker = {ticker} interval='1d' period='max'/>
                </div>
                <div className="Sidebar">
                </div>
                
            </div>
        </>
    );
}