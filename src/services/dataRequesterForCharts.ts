import axios from 'axios';
import type { DataResponse as OhlcvArrayResponse, QuoteResponse } from '@shared/contract/market';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Auth is cookie-based: every request is sent with credentials so the
 * HttpOnly access_token cookie is attached automatically by the browser.
 * No token is read from localStorage or sent as an Authorization header.
 */
export async function fetchData(
  ticker: string,
  interval: string,
  period: string,
): Promise<OhlcvArrayResponse> {
  const url = `${API_BASE_URL}/data`;
  try {
    const response = await axios.get<OhlcvArrayResponse>(url, {
      params: { ticker, period, interval },
      withCredentials: true,
    });
    const data = response.data;
    console.log('Data: ', data);
    return data;
  } catch (err) {
    console.warn('fetchData failed', err);
    return [];
  }
}

export async function fetchQuote(ticker: string): Promise<QuoteResponse> {
  const url = `${API_BASE_URL}/quote`;
  try {
    const response = await axios.get<QuoteResponse>(url, {
      params: { ticker },
      withCredentials: true,
    });
    const data = response.data;
    console.log(data);
    return data;
  } catch (err) {
    console.warn('fetchQuote failed', err);
    return { ticker, currentPrice: 0, change: 0, percentChange: 0 };
  }
}

export async function fetchIndicatorData(
  properties: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `${API_BASE_URL}/data/indicator`;
  try {
    const response = await axios.get<Record<string, unknown>>(url, {
      params: properties,
      withCredentials: true,
    });
    const data = response.data;
    console.log('Fetching Indicator data: ', data);
    return data;
  } catch (err) {
    console.warn('fetchIndicatorData failed', err);
    return {};
  }
}
