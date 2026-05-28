import indicesData from './world_indices_yahoo.json' with {type: 'json'};
import { fetchQuote } from '../dataRequesterForCharts';
let marketCurrentQuoteCache = {};

function marketQuoteHandler(data){
    marketCurrentQuoteCache[data.ticker] = data;
}

export {marketQuoteHandler , marketCurrentQuoteCache};
