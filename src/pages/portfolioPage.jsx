import { useState } from "react";
import { useEffect } from "react";
import Navbar from "./navbar";
import api from './api.js';
import { fetchQuote } from "./Charts/dataRequester";
import './styles/portfolioPage.css'

export default function PortfolioPage() {
    const [assetList, setAssetList] = useState([]);
    const [prices, setPrices] = useState({});
    const [totalPnl, setTotalPnl] = useState(null);
    const [userEquity, setUserEquity] = useState({});
    useEffect(() => {

        async function getUser() {
            try {
                const userData = await api.get("/user-data");
                console.log(userData.data);
                setUserEquity({
                    balance: userData.data.balance,
                    equity: userData.data.balance
                });
            } catch (err) {
                console.log(err);
            }
        }

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
        getUser();
        getPortfolio();
        const intervalID1 = setInterval(getPortfolio, 10000);
        const intervalID2 = setInterval(getUser, 10000);
        return () => { clearInterval(intervalID1); clearInterval(intervalID2); }
    }, []);

    useEffect(() => {



        async function updatePrices() {
            if (assetList.length === 0) return;
            try {
                const quotes = await Promise.all(
                    assetList.map(item => fetchQuote(item.symbol))); 
                    //.map() will return an array of pending promises which will be run at the same time

                const updatedData = {};
                let total = 0;

                quotes.forEach((quote, index) => {
                    const item = assetList[index];
                    //const pnl = Number((quotes.currentPrice - item.avgPrice) * item.shares)
                    const stockPnl = Number((quote.currentPrice - item.avgPrice) * item.shares);

                    const priceChangePercent = Number (((quote.currentPrice - item.avgPrice) / item.avgPrice) * 100);

                    updatedData[item.symbol] = {
                        Pnl: stockPnl.toFixed(2),
                        pChange: item.shares >=0 ? priceChangePercent.toFixed(2): -1*priceChangePercent.toFixed(2)
                    };

                    total += stockPnl;
                });

                setPrices(updatedData);
                setTotalPnl(Number(total.toFixed(2)));
                setUserEquity(prev => ({
                    ...prev,
                    equity: prev.balance + Number(total.toFixed(2))
                }));

            } catch (err) {
                console.log(err);
            }
        }
        updatePrices();
        const id = setInterval(updatePrices, 10000);
        return () => clearInterval(id);
    }, [assetList]);

    return (
        <>
            <div className="Portfolio-page">
                <Navbar />
                <div className="Portfolio-of-user">
                    <div className="Account-status">

                        <div className="Account-status-component">
                            <h4>Unrealized P&L</h4>
                            <h4 className={Number(totalPnl) >= 0 ? 'positive' : 'negative'} >{totalPnl}</h4>
                        </div>
                        <div className="Account-status-component">
                            <h4>Account Balance</h4>
                            <h4>{(userEquity.balance) ? userEquity.balance.toFixed(2): null}</h4>
                        </div>
                        <div className="Account-status-component">
                            <h4>Equity</h4>
                            <h4>{(userEquity.equity) ? userEquity.equity.toFixed(2):null}</h4>
                        </div>

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