import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function fetchData(ticker, interval, period) {
  const url = `${API_BASE_URL}/data`;
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(url, {
      params: { ticker, period, interval },
      headers,
    });
    const data = response.data;
    console.log('Data: ', data);
    return data;
  } catch (err) {
    console.warn('fetchData failed', err);
    return [];
  }
}

export async function fetchQuote(ticker) {
  const url = `${API_BASE_URL}/quote`;
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(url, {
      params: { ticker },
      headers,
    });
    const data = response.data;
    console.log(data);
    return data;
  } catch (err) {
    console.warn('fetchQuote failed', err);
    return { currentPrice: 0 };
  }
}

export async function fetchIndicatorData(properties) {
  const url = `${API_BASE_URL}/data/indicator`;
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(url, {
      params: properties,
      headers,
    });
    const data = response.data;
    console.log('Fetching Indicator data: ', data);
    return data;
  } catch (err) {
    console.warn('fetchIndicatorData failed', err);
    return {};
  }
}
