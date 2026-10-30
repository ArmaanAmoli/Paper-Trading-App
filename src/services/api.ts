import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig, AxiosInstance } from 'axios';
import type {
  QuoteResponse,
  DataResponse as OhlcvArrayResponse,
  SearchResponse,
  IndicatorResponse,
  UserDataResponse,
  WatchlistResponse,
  AddToWatchlistResponse,
  DeleteFromWatchlistResponse,
} from '@shared/contract/market';
import type {
  BuyResponse,
  SellResponse,
  StopLossBody,
  StopLossResponse,
  GetStopLossResponse,
  DeleteStopLossResponse,
  TradeHistoryResponse,
  PortfolioResponse,
} from '@shared/contract/trade';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.set('authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/' && window.location.pathname !== '/signup') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// Market data endpoints
export async function fetchQuote(ticker: string): Promise<QuoteResponse> {
  const response = await api.get<QuoteResponse>('/quote', { params: { ticker } });
  return response.data;
}

export async function fetchOhlcvData(
  ticker: string,
  period: string,
  interval: string,
): Promise<OhlcvArrayResponse> {
  const response = await api.get<OhlcvArrayResponse>('/data', {
    params: { ticker, period, interval },
  });
  return response.data;
}

export async function searchTickers(query: string): Promise<SearchResponse> {
  const response = await api.get<SearchResponse>('/search', { params: { query } });
  return response.data;
}

export async function fetchIndicatorData(
  params: Record<string, unknown>,
): Promise<IndicatorResponse> {
  const response = await api.get<IndicatorResponse>('/data/indicator', { params });
  return response.data;
}

// Portfolio & account
export async function fetchPortfolio(): Promise<PortfolioResponse> {
  const response = await api.get<PortfolioResponse>('/portfolio');
  return response.data;
}

export async function fetchUserData(): Promise<UserDataResponse> {
  const response = await api.get<UserDataResponse>('/user-data');
  return response.data;
}

export async function fetchTradeHistory(): Promise<TradeHistoryResponse> {
  const response = await api.get<TradeHistoryResponse>('/trade-history');
  return response.data;
}

// Watchlist
export async function fetchWatchlist(): Promise<WatchlistResponse[]> {
  const response = await api.get<WatchlistResponse[]>('/user-watchlist');
  return response.data;
}

export async function addToWatchlist(symbol: string): Promise<AddToWatchlistResponse> {
  const response = await api.post<AddToWatchlistResponse>('/user-watchlist/add', { symbol });
  return response.data;
}

export async function deleteFromWatchlist(symbol: string): Promise<DeleteFromWatchlistResponse> {
  const response = await api.delete<DeleteFromWatchlistResponse>('/user-watchlist/delete', {
    data: { symbol },
  });
  return response.data;
}

// Stop losses
export async function fetchActiveStopLosses(symbol?: string): Promise<GetStopLossResponse> {
  const params = symbol ? { symbol } : {};
  const response = await api.get<GetStopLossResponse>('/stopLoss', { params });
  return response.data;
}

export async function cancelStopLoss(stopLossId: string): Promise<DeleteStopLossResponse> {
  const response = await api.delete<DeleteStopLossResponse>(`/stopLoss/${stopLossId}`);
  return response.data;
}

// Trade execution
export async function executeBuy(symbol: string, qty: number): Promise<BuyResponse> {
  const response = await api.post<BuyResponse>('/buy', { symbol, qty, side: 'buy' as const });
  return response.data;
}

export async function executeSell(symbol: string, qty: number): Promise<SellResponse> {
  const response = await api.post<SellResponse>('/sell', { symbol, qty, side: 'sell' as const });
  return response.data;
}

export async function placeStopLoss(body: StopLossBody): Promise<StopLossResponse> {
  const response = await api.post<StopLossResponse>('/stopLoss', body);
  return response.data;
}
