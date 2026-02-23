import { useState } from "react";
import { useEffect } from "react";
import Navbar from "./navbar";
import api from './api.js';
import { fetchQuote } from "./Charts/dataRequester";
import './styles/portfolioPage.css'
export default function PortfolioPage() {
    const [assetList, setAssetList] = useState([]);
    const [prices, setPrices] = useState({});
    const [totalPnl , setTotalPnl] = useState(null);
    const [adjBalance , setBalance] = useState(null);
    useEffect(() => {

        async function getPortfolio() {
            try {
                const portfolio = await api.get("/portfolio");
                console.log(portfolio.data.positions);
                setAssetList(portfolio.data.positions);
                return
            }
            catch (err) {
                console.log(err)
            }
        }
        getPortfolio();
        const intervalID = setInterval(getPortfolio, 10000);
        return () => clearInterval(intervalID);
    }, []);

    useEffect(() => {
        async function updatePrices() {
            if (assetList.length === 0) return;
            const updatedData = {};
            for (const item of assetList) {
                try {
                    const quote = await fetchQuote(item.symbol);
                    updatedData[item.symbol] = { 'Pnl': ((quote.currentPrice - item.avgPrice) * item.shares).toFixed(2), 'pChange': ((quote.currentPrice - item.avgPrice) * 100 / item.avgPrice).toFixed(2) };
                } catch (e) { console.log(e) };
            }
            setPrices(prev => ({ ...prev, ...updatedData }));
            let pnl = 0;
            for(const item of assetList){
                pnl = Math.round((pnl + Number(prices[item.symbol].Pnl)) * 100) / 100;
            }
            setTotalPnl(pnl);
        };
        updatePrices();
        const intervalID = setInterval(updatePrices, 10000);
        return () => clearInterval(intervalID);
    }, [assetList , prices])

    return (
        <>
            <div className="Portfolio-page">
                <Navbar />
                <div className="Portfolio-of-user">
                    <div className="Account-status">
                        <h4>Total Pnl: {totalPnl}</h4>
                        <h4>Balance: {}</h4>
                    </div>
                    <table className="Asset-Table">
                        <thead className="headings">
                            <tr >
                                <th>S.No</th>
                                <th>Symbol</th>
                                <th>Side</th>
                                <th>#</th>
                                <th>Daily PnL</th>
                                <th>%Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assetList.map((item, index) => (
                                <tr key={item.symbol} className="row">
                                    <td>{index + 1}</td>
                                    <td>{item.symbol}</td>
                                    <td className={item.shares > 0 ? 'long-badge' : 'short-badge'}>
                                        {item.shares > 0 ? 'long' : 'short'}
                                    </td>
                                    <td>{Math.abs(item.shares)}</td>
                                    <td className={Number(prices[item.symbol]?.Pnl) >= 0 ? 'positive' : 'negative'}>
                                        {prices[item.symbol]?.Pnl ?? <span className="loading-dot">...</span>}
                                    </td>
                                    <td className={Number(prices[item.symbol]?.pChange) >= 0 ? 'positive' : 'negative'}>
                                        {prices[item.symbol]?.pChange ?? <span className="loading-dot">...</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}