import { useState } from "react";
import { useEffect } from "react";
import Navbar from "./navbar";
import api from './api.js';
import { fetchQuote } from "./Charts/dataRequester";
import './styles/portfolioPage.css'
export default function PortfolioPage() {
    const [assetList, setAssetList] = useState([]);
    const [prices, setPrices] = useState({});
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
        if (assetList.length === 0) return;
        async function updatePrices() {
            const updatedData = {};
            for (const item of assetList) {
                try {
                    const quote = await fetchQuote(item.symbol);
                    updatedData[item.symbol] = { 'Pnl': ((quote.currentPrice - item.avgPrice) * item.shares).toFixed(2), 'pChange': ((quote.currentPrice - item.avgPrice) * 100 / item.avgPrice).toFixed(2) };
                } catch (e) { console.log(e) };
            }
            setPrices(prev => ({ ...prev, ...updatedData }));
        };
        updatePrices();
        const intervalID = setInterval(updatePrices, 10000);
        return () => clearInterval(intervalID);
    }, [assetList])

    return (
        <>
            <div className="Portfolio-page">
                <Navbar />
                <div className="Portfolio-of-user">
                    <table className="Asset-Table">
                        <thead className="headings">
                            <tr >
                                <th>S.No</th>
                                <th>Symbol</th>
                                {/* <th>Full Name</th> */}
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
                                    <td>{item.shares}</td>
                                    <td>{prices[item.symbol]?.Pnl ?? '...'}</td>
                                    <td>{prices[item.symbol]?.pChange ?? '...'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}