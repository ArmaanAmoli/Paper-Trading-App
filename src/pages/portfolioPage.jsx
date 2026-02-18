import { useState } from "react";
import { useEffect } from "react";
import { getQuote } from "../../server/getQuote";
import Navbar from "./navbar";
import axios from "axios";
import { data } from "react-router-dom";
import { fetchQuote } from "./Charts/dataRequester";

export default function PortfolioPage() {
    const [assetList, setAssetList] = useState([]);
    const [prices , setPrices] = useState({});
    const token = localStorage.getItem('token');
    useEffect(() => {
        async function getPortfolio() {
            try {
                const portfolio = await axios.get("http://localhost:3000/portfolio", {
                    headers: {
                        'authorization': `Bearer ${token}`
                    }
                }
                )
                console.log(portfolio.data.positions);
                setAssetList(portfolio.data.positions);
                return
            }
            catch (err) {
                console.log(err);
            }
        }
        getPortfolio();
    }, [token]);

    useEffect(()=>{
        if(assetList.length === 0) return;
        async function updatePrices(){
            const updatedData = {};
            for(const item of assetList){
                try{
                    const quote = await getQuote(item.symbol);
                    updatedData[item.symbol] = {Pnl: quote.currentPrice-item.avgPrice};
                }catch(e){console.log(e)};
            }
            setPrices(prev=>({...prev , ...updatePrices}));
        };
        updatePrices();
    })

    return (
        <>
            <div className="Portfolio-page">
                <Navbar />
                <div className="Portfolio-of-user">
                    <table className="Asset-Table">
                        <thead>
                            <tr>
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
                                <tr key={item.symbol}>
                                    <td>{index + 1}</td>
                                    <td>{item.symbol}</td>
                                    <td>{item.shares}</td>
                                    <td>{setInterval(
                                        async () => {
                                            const { currentPrice } = getQuote(item.symbol);
                                            return currentPrice;
                                        }, 5000)}</td>
                                    <td>{setInterval(
                                        async () => {
                                            const { percentChange } = getQuote(item.symbol);
                                            return percentChange;
                                        }, 5000)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}