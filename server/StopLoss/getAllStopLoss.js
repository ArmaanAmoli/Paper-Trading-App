import { getAllSL } from "../queryManager.js";
const allStopLoss = await getAllSL();
const tickerToSL = new Map();
// console.log(allStopLoss)
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
// console.log(tickerToSL)
export {allStopLoss , tickerToSL};