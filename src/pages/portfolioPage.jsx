import { useContext} from "react";
import Navbar from "./navbar";
import './styles/portfolioPage.css'
import { UserAccountContext, UserEquityContext } from "./context.js";

export default function PortfolioPage() {
    const [userAccountInformation, setUserAccountInformation] = useContext(UserAccountContext);
    // const data = useContext(UserEquityContext);
    const [assetList, setAssetList] = useContext(UserEquityContext).portfolio || [];
    const [prices, setPrices] = useContext(UserEquityContext).pnl;
    const [totalPnl, setTotalPnl] = useContext(UserEquityContext).totalPnl;
    const [Equity , setEquity] = useContext(UserEquityContext).totalEquity;
    return (
        <>
            <div className="Portfolio-page">
                <Navbar />
                <div className="Portfolio-of-user">
                    <div className="Account-status">

                        <div className="Account-status-component">
                            <h4>Unrealized P&L</h4>
                            <h4 className={Number(totalPnl) >= 0 ? 'positive' : 'negative'} >{Number(totalPnl).toFixed(2)}</h4>
                        </div>
                        <div className="Account-status-component">
                            <h4>Account Balance</h4>
                            <h4>{(userAccountInformation.balance) ? Number(userAccountInformation.balance.toFixed(2)): 0}</h4>
                        </div>
                        <div className="Account-status-component">
                            <h4>Equity</h4>
                            <h4>{((userAccountInformation.balance) ? Number(Equity + userAccountInformation.balance): 0 ).toFixed(2)}</h4>
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
                            {assetList && assetList.length >0 && assetList.map((item, index) => (
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