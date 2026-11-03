import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pythonClient } from '../lib/pythonClient.ts';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

let mockGet: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  mockGet = vi.fn();
  (pythonClient as any).axiosInstance.get = mockGet;
});

describe('pythonClient.getQuote', () => {
  it('requests quote for a ticker and returns parsed response', async () => {
    mockGet.mockResolvedValue({ data: { ticker: 'AAPL', currentPrice: 150, change: 1, percentChange: 0.67 } });

    const result = await pythonClient.getQuote('AAPL');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/quote', { params: { ticker: 'AAPL' } });
    expect(result).toEqual({ ticker: 'AAPL', currentPrice: 150, change: 1, percentChange: 0.67 });
  });

  it('throws when the FastAPI service errors', async () => {
    mockGet.mockRejectedValue(new Error('network error'));

    await expect(pythonClient.getQuote('AAPL')).rejects.toThrow('network error');
  });
});

describe('pythonClient.getOhlcvData', () => {
  it('requests OHLCV data with ticker, period, interval', async () => {
    const rows = [
      { Date: '2026-01-01', Open: 100, High: 105, Low: 99, Close: 104, Volume: 1000 },
    ];
    mockGet.mockResolvedValue({ data: rows });

    const result = await pythonClient.getOhlcvData('AAPL', '1mo', '1d');

    expect(mockGet).toHaveBeenCalledWith('/data', { params: { ticker: 'AAPL', period: '1mo', interval: '1d' } });
    expect(result).toEqual(rows);
  });

  it('throws when the response does not match the OHLCV schema', async () => {
    mockGet.mockResolvedValue({ data: [{ not: 'ohlcv' }] });

    await expect(pythonClient.getOhlcvData('AAPL', '1mo', '1d')).rejects.toThrow();
  });
});

describe('pythonClient.searchTickers', () => {
  it('searches tickers with a query string', async () => {
    const results = [{ symbol: 'AAPL', shortname: 'Apple Inc' }];
    mockGet.mockResolvedValue({ data: results });

    const result = await pythonClient.searchTickers('app');

    expect(mockGet).toHaveBeenCalledWith('/search', { params: { query: 'app' } });
    expect(result).toEqual(results);
  });
});

describe('pythonClient.getIndicatorData', () => {
  it('requests indicator data with all params', async () => {
    const result = [{ Date: '2026-01-01', SMA: 100 }];
    mockGet.mockResolvedValue({ data: result });

    const params = {
      ticker: 'AAPL',
      indicator: 'SMA',
      interval: '1d',
      period: '1mo',
      timeperiod: 20,
      matype: true,
      stdUp: 2,
      stdDown: 2,
      fastk_period: 5,
      slowk_period: 3,
      slowk_matype: 0,
      slowd_period: 3,
      slowd_matype: 0,
      fastPeriod: 5,
    };

    const data = await pythonClient.getIndicatorData(params);

    expect(mockGet).toHaveBeenCalledWith('/data/indicator', { params });
    expect(data).toEqual(result);
  });
});
