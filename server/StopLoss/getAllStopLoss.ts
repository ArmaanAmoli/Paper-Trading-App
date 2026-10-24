import { getAllSL } from '../queryManager.js';
import { StopLossDocument } from '../Schemas/mongoSchema.js';

let allStopLossPromise = getAllSL().then((allStopLoss: StopLossDocument[]) => {
  const tickerToSL = new Map<string, StopLossDocument[]>();
  // console.log(allStopLoss)
  allStopLoss.forEach((slo) => {
    const ticker = slo.symbol;
    if (!tickerToSL.has(ticker)) {
      tickerToSL.set(slo.symbol, [slo]);
      return;
    }
    const value = tickerToSL.get(ticker);
    if (value) {
      value.push(slo);
      tickerToSL.set(ticker, value);
    }
  });
  // console.log(tickerToSL)
  return { allStopLoss, tickerToSL };
});

export { allStopLossPromise };
export { tickerToSL };
