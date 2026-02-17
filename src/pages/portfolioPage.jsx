import { useState } from "react";
import { useEffect } from "react";
import { getQuote } from "../../server/getQuote";
import Navbar from "./navbar";
import axios from "axios";

export default function PortfolioPage() {
    const [assetList, setAssetList] = useState({});
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
                return portfolio.data;
            }
            catch (err) {
                console.log(err);
            }
        }
        getPortfolio();

        //cosnt currentPrice = await getQuote
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

                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}