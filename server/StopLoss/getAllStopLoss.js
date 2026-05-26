import { getAllStopLoss } from "../queryManager";
export const allStopLoss = await getAllStopLoss();
export const tickerToSL = new Map();
allStopLoss.forEach((slo)=>{
    const ticker = slo.symbol;
    if(!tickerToSL.has(ticker)){
        tickerToSL.set(slo.symbol , [slo]);
        continue;
    }
    const value = tickerToSL.get(ticker);
    value.push(slo);
    tickerToSL.set(ticker , value);
})
