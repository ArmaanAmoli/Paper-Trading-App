import api from './api';
import type { TradeHistoryResponse } from '@shared/contract/trade';

export async function getTradeHistory(): Promise<TradeHistoryResponse> {
  try {
    const res = await api.get<TradeHistoryResponse>('/trade-history');
    console.log(res.data);
    return res.data;
  } catch (err) {
    console.log('Error occurred while catching user trade history: ', err);
    throw err;
  }
}
