import { getAllSL } from '../queryManager.js';

let allStopLossPromise = getAllSL().then((allStopLoss) => {
  const tickerToSL = new Map();
  // console.log(allStopLoss)
  allStopLoss.forEach((slo) => {
    const ticker = slo.symbol;
    if (!tickerToSL.has(ticker)) {
      tickerToSL.set(slo.symbol, [slo]);
      return;
    }
    const value = tickerToSL.get(ticker);
    value.push(slo);
    tickerToSL.set(ticker, value);
  });
  // console.log(tickerToSL)
  return { allStopLoss, tickerToSL };
});

export { allStopLossPromise };
