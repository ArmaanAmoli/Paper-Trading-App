import { getAllSL } from "../queryManager.js";
export const allStopLoss = await getAllSL();
export const tickerToSL = new Map();
allStopLoss.forEach((slo)=>{
    const ticker = slo.symbol;
    if(!tickerToSL.has(ticker)){
        tickerToSL.set(slo.symbol , [slo]);
        return;
    }
    const value = tickerToSL.get(ticker);
    value.push(slo);
    tickerToSL.set(ticker , value);
})
