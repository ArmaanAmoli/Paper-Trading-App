import clickSound from '../assets/sound/position-sound.mp3';
import api from './api';
import type { BuyResponse, StopLossBody, StopLossResponse } from '@shared/contract/trade';

export async function placeOrder(
  ticker: string,
  qty: number,
  side: 'buy' | 'sell',
  stopLossOrder: StopLossBody | null,
): Promise<{
  trade: { success: boolean; data: BuyResponse | null; error: string | null };
  stopLoss: { success: boolean; data: StopLossResponse | null; error: string | null };
}> {
  const data = { symbol: ticker, qty, side };

  // Execute trade
  let tradeResult = {
    success: false as boolean,
    data: null as BuyResponse | null,
    error: null as string | null,
  };
  try {
    const response =
      side === 'buy'
        ? await api.post<BuyResponse>('/buy', data)
        : await api.post<BuyResponse>('/sell', data);
    tradeResult = { success: true, data: response.data, error: null };
  } catch (err) {
    const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
    tradeResult = {
      success: false,
      data: null,
      error: axiosError.response?.data?.message || axiosError.message || 'Unknown error',
    };
  }

  // Execute stop loss if provided
  let stopLossResult = {
    success: false as boolean,
    data: null as StopLossResponse | null,
    error: null as string | null,
  };
  if (stopLossOrder !== null && stopLossOrder.qty !== 0 && stopLossOrder.price !== 0) {
    try {
      const response = await api.post<StopLossResponse>('/stopLoss', stopLossOrder);
      if (response.data?.message) {
        stopLossResult = { success: true, data: response.data, error: null };
      } else {
        stopLossResult = { success: false, data: null, error: 'Unexpected stop loss response' };
      }
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      stopLossResult = {
        success: false,
        data: null,
        error: axiosError.response?.data?.message || axiosError.message || 'Unknown error',
      };
    }
  }

  const audio = new Audio(clickSound);
  await audio.play();

  return { trade: tradeResult, stopLoss: stopLossResult };
}
