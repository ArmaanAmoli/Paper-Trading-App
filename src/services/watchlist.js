import api from './api.js';
import { WatchlistContext } from '../Context/context.js';

export async function addToWatchlist(symbol) {
  const data = {
    symbol: symbol,
  };
  try {
    const res = await api.post('/user-watchlist/add', data);
    console.log(res.data);
    return res.data;
  } catch (err) {
    console.log(`Error in add to watchlist function ${err}`);
  }
}

export async function getWatchlist() {
  try {
    const res = await api.get('/user-watchlist');
    // Return the first watchlist document or a default object with empty symbols array
    return res.data[0] || { symbols: [] };
  } catch (err) {
    console.log(`Error in getWatchlist function ${err}`);
    return { symbols: [] };
  }
}

export async function deleteFromWatchlist(symbol) {
  const data = {
    symbol: symbol,
  };
  try {
    const res = await api.delete('/user-watchlist/delete', { data: data });
    console.log(res.data);
    return res.data;
  } catch (err) {
    console.log(`Error in delete from watchlist function ${err}`);
  }
}
