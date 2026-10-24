import { getAllSL } from '../queryManager.js';
import type { StopLossDocument } from '../Schemas/mongoSchema.js';

export const tickerToSL = new Map<string, StopLossDocument[]>();

export const allStopLossPromise = getAllSL().then((allStopLoss: StopLossDocument[]) => {
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
