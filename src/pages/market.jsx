import { useContext } from "react";
import { MarketData } from "../Context/context";
import marketSymbols from "../services/Indices data/indicesFullName.json"
import { useNavigate } from "react-router-dom";

export default function Market() {
    const navigate = useNavigate();
    const marketDataMap = useContext(MarketData);
    const tickers = Object.keys(marketSymbols);

    return (
        <div className="w-full h-full flex flex-col">
            <h1 className="text-lg font-semibold text-text-primary mb-4">Markets Today</h1>
            <div className="panel flex-1 min-h-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table market-table" role="grid">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Index</th>
                                <th>Symbol</th>
                                <th className="numeric">Price</th>
                                <th className="numeric">Change</th>
                                <th className="numeric">%Chg</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marketDataMap && marketDataMap.size > 0 && tickers.map((ticker, index) => {
                                const quote = marketDataMap.get(ticker);
                                if (quote === undefined) return null;
                                const indexFullName = marketSymbols[ticker];
                                const isPositive = quote.change > 0;
                                const isNegative = quote.change < 0;
                                const changePrefix = isPositive ? "+" : isNegative ? "" : "";
                                const rowColorClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';

                                return (
                                    <tr
                                        key={ticker + index}
                                        className="cursor-pointer"
                                        onClick={() => navigate(`/chart/${ticker}`)}
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/chart/${ticker}`); }}
                                    >
                                        <td className="text-text-dim tabular-nums">{index + 1}</td>
                                        <td className="text-text-primary">{indexFullName}</td>
                                        <td className="font-medium text-text-secondary tabular-nums">{ticker}</td>
                                        <td className="numeric">
                                            <span className={rowColorClass}>{quote.currentPrice.toLocaleString()}</span>
                                        </td>
                                        <td className="numeric">
                                            <span className={rowColorClass}>{changePrefix}{quote.change.toFixed(2)}</span>
                                        </td>
                                        <td className="numeric">
                                            <span className={rowColorClass}>{changePrefix}{quote.percentChange.toFixed(2)}%</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}