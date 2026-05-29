import { useContext } from "react";
import { MarketData } from "../Context/context";
import marketSymbols from "../services/Indices data/indicesFullName.json"

export default function Market() {
    const marketDataMap = useContext(MarketData);
    const tickers = Object.keys(marketSymbols);
    return (
        <div className="w-full h-full flex flex-col p-2">
            <h1>Markets Today</h1>
            <table className="w-full border">
                <thead className="w-full">
                    <tr className="w-full grid grid-cols-10 gap-2 py-4" >
                        <th className='col-span-1 grid justify-center items-center h-full'>S.No</th>
                        <th className='col-span-3 grid justify-center items-center h-full'>Index</th>
                        <th className='col-span-2 grid justify-center items-center h-full'>Symbol</th>
                        <th className='col-span-2 grid justify-center items-center h-full'>Price</th>
                        <th className='col-span-1 grid justify-center items-center h-full'>Daily chang</th>
                        <th className='col-span-1 grid justify-center items-center h-full'>%Chg</th>
                    </tr>

                </thead>
                <tbody className="w-full">
                    {marketDataMap && marketDataMap.size > 0 && tickers.map((ticker, index) => {
                        const quote = marketDataMap.get(ticker);
                        console.log(quote);
                        if(quote === undefined)return;
                        const indexFullName = marketSymbols[ticker];
                        const value = quote.change;
                        const textStyle = {
                            color: value > 0 ? "#8bf31c" : value < 0 ? "#FF0000" : "white"
                        };

                        return (
                            <tr className='w-full grid grid-cols-10 gap-2 py-4' key={ticker + index}>
                                <td className='col-span-1 grid justify-center items-center'>{index + 1}</td>
                                <td className='col-span-3 grid justify-center items-center'>{indexFullName}</td>
                                <td className='col-span-2 grid justify-center items-center'>{ticker}</td>
                                <td className='col-span-2 grid justify-center items-center'>{quote.currentPrice}</td>
                                <td className='col-span-1 grid justify-center items-center' style={textStyle}>{quote.change.toFixed(2)}</td>
                                <td className='col-span-1 grid justify-center items-center' style={textStyle}>{quote.percentChange.toFixed(2)}</td>
                            </tr>
                        );
                    })}

                </tbody>
            </table>
        </div>
    );
}