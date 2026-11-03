import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { fetchData, fetchIndicatorData, fetchQuote } from './dataRequesterForCharts';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios);

beforeEach(() => {
  mockedAxios.get.mockReset();
});

afterEach(() => {
  localStorage.clear();
});

describe('fetchData', () => {
  it('requests OHLCV data with the ticker, period and interval', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    await fetchData('AAPL', '1d', '1mo');

    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/data', {
      params: { ticker: 'AAPL', period: '1mo', interval: '1d' },
      headers: {},
    });
  });

  it('sends the bearer token when one is stored', async () => {
    localStorage.setItem('token', 'jwt-token');
    mockedAxios.get.mockResolvedValue({ data: [] });

    await fetchData('AAPL', '1d', '1mo');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:3001/data',
      expect.objectContaining({ headers: { authorization: 'Bearer jwt-token' } }),
    );
  });

  it('returns an empty array when the request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network down'));

    const result = await fetchData('AAPL', '1d', '1mo');

    expect(result).toEqual([]);
  });
});

describe('fetchQuote', () => {
  it('requests a quote for the ticker', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { ticker: 'AAPL', currentPrice: 150, change: 1, percentChange: 0.5 },
    });

    const quote = await fetchQuote('AAPL');

    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/quote', {
      params: { ticker: 'AAPL' },
      headers: {},
    });
    expect(quote).toEqual({ ticker: 'AAPL', currentPrice: 150, change: 1, percentChange: 0.5 });
  });

  it('returns a zeroed quote when the request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network down'));

    const quote = await fetchQuote('AAPL');

    expect(quote).toEqual({ ticker: 'AAPL', currentPrice: 0, change: 0, percentChange: 0 });
  });
});

describe('fetchIndicatorData', () => {
  it('requests indicator data with the supplied properties', async () => {
    mockedAxios.get.mockResolvedValue({ data: { MIDDLE: [] } });

    const result = await fetchIndicatorData({ ticker: 'AAPL', indicator: 'SMA' });

    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/data/indicator', {
      params: { ticker: 'AAPL', indicator: 'SMA' },
      headers: {},
    });
    expect(result).toEqual({ MIDDLE: [] });
  });

  it('returns an empty object when the request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network down'));

    const result = await fetchIndicatorData({ ticker: 'AAPL', indicator: 'SMA' });

    expect(result).toEqual({});
  });
});
