import api from './api';
import type {
  AddToWatchlistResponse,
  DeleteFromWatchlistResponse,
  WatchlistResponse,
  WatchlistItem,
} from '@shared/contract/market';

export async function addToWatchlist(symbol: string): Promise<AddToWatchlistResponse> {
  const data = { symbol };
  try {
    const res = await api.post<AddToWatchlistResponse>('/user-watchlist/add', data);
    console.log(res.data);
    return res.data;
  } catch (err) {
    console.log('Error in add to watchlist function:', err);
    throw err;
  }
}

export async function getWatchlist(): Promise<WatchlistItem> {
  try {
    const res = await api.get<WatchlistResponse>('/user-watchlist');
    return res.data[0] || { _id: '', userId: '', symbols: [] };
  } catch (err) {
    console.log(`Error in getWatchlist function ${String(err)}`);
    return { _id: '', userId: '', symbols: [] };
  }
}

export async function deleteFromWatchlist(symbol: string): Promise<DeleteFromWatchlistResponse> {
  const data = { symbol };
  try {
    const res = await api.delete<DeleteFromWatchlistResponse>('/user-watchlist/delete', { data });
    console.log(res.data);
    return res.data;
  } catch (err) {
    console.log(`Error in delete from watchlist function ${String(err)}`);
    throw err;
  }
}
