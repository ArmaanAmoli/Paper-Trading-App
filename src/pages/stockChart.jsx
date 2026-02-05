import {useParams} from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import "./styles/stockChart.css"
export default function StockMainChart(){
    const {ticker} = useParams();

    return(
        <>
            <div className="chart-page">
                <div className="Chart">
                </div>
                <div className="Sidebar">
                </div>
                
            </div>
        </>
    );
}