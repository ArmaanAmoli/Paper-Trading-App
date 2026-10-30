import api from '../services/api';
import type { TradeHistoryResponse } from '@shared/contract/trade';

async function getTradeHistory(): Promise<TradeHistoryResponse | false> {
  try {
    const res = await api.get('/trade-history');
    console.log(res.data); // To Be Removed
    return res.data as TradeHistoryResponse;
  } catch (err) {
    console.log('Error occured while catching user trade history: ', err);
    return false;
  }
}

export { getTradeHistory };
