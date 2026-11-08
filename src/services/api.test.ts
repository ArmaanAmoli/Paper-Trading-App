// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import api, {
  addToWatchlist,
  cancelStopLoss,
  deleteFromWatchlist,
  executeBuy,
  executeSell,
  fetchActiveStopLosses,
  fetchIndicatorData,
  fetchOhlcvData,
  fetchPortfolio,
  fetchQuote,
  fetchTradeHistory,
  fetchUserData,
  fetchWatchlist,
  placeStopLoss,
  searchTickers,
} from './api';

function createResponse<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

function createUnauthorized(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
    data: { message: 'No token provided' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  });
}

function readJsonBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const raw: unknown = config.data;
  if (typeof raw !== 'string') return {};
  const parsed: unknown = JSON.parse(raw);
  return parsed as Record<string, unknown>;
}

const originalAdapter = api.defaults.adapter;
let location: { pathname: string; href: string };

beforeEach(() => {
  location = { pathname: '/', href: '' };
  vi.stubGlobal('window', { location });
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe('api instance configuration', () => {
  it('uses the configured base URL and cookie credentials', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:3001');
    expect(api.defaults.withCredentials).toBe(true);
  });
});

describe('response interceptor', () => {
  it('refreshes the session and retries the original request on a 401 response', async () => {
    let userDataCalls = 0;
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      if (config.url === '/auth/refresh') {
        return createResponse(config, { message: 'Token refreshed' });
      }

      if (config.url === '/user-data') {
        userDataCalls += 1;
        if (userDataCalls === 1) {
          throw createUnauthorized(config);
        }
        return createResponse(config, { authenticated: true });
      }

      return createResponse(config, {});
    });
    api.defaults.adapter = adapter;

    const result = await fetchUserData();

    expect(result).toEqual({ authenticated: true });
    expect(userDataCalls).toBe(2);
    expect(location.href).toBe('');
  });

  it('redirects to the root when the session cannot be refreshed', async () => {
    location.pathname = '/landing-page';
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      throw createUnauthorized(config);
    });
    api.defaults.adapter = adapter;

    await expect(fetchUserData()).rejects.toBeInstanceOf(AxiosError);
    expect(location.href).toBe('/');
  });

  it('does not redirect when the failing path is already the root', async () => {
    location.pathname = '/';
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      throw createUnauthorized(config);
    });
    api.defaults.adapter = adapter;

    await expect(fetchUserData()).rejects.toBeInstanceOf(AxiosError);
    expect(location.href).toBe('');
  });

  it('does not retry the refresh endpoint itself', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      throw createUnauthorized(config);
    });
    api.defaults.adapter = adapter;

    await expect(api.post('/auth/refresh')).rejects.toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('does not retry or redirect for non-401 failures', async () => {
    location.pathname = '/landing-page';
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      throw new AxiosError('Server Error', 'ERR_BAD_RESPONSE', config, undefined, {
        data: { message: 'Internal server error' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config,
      });
    });
    api.defaults.adapter = adapter;

    await expect(fetchUserData()).rejects.toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(location.href).toBe('');
  });
});

describe('api endpoint helpers', () => {
  it('fetches a quote with the ticker as a query parameter', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) =>
      createResponse(config, { ticker: 'AAPL', currentPrice: 150, change: 1, percentChange: 0.5 }),
    );
    api.defaults.adapter = adapter;

    const quote = await fetchQuote('AAPL');

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.method).toBe('get');
    expect(sentConfig.url).toBe('/quote');
    expect(sentConfig.params).toEqual({ ticker: 'AAPL' });
    expect(quote).toEqual({ ticker: 'AAPL', currentPrice: 150, change: 1, percentChange: 0.5 });
  });

  it('fetches OHLCV data with ticker, period and interval', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => createResponse(config, []));
    api.defaults.adapter = adapter;

    await fetchOhlcvData('AAPL', '1mo', '1d');

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.url).toBe('/data');
    expect(sentConfig.params).toEqual({ ticker: 'AAPL', period: '1mo', interval: '1d' });
  });

  it('searches tickers with the query parameter', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => createResponse(config, []));
    api.defaults.adapter = adapter;

    await searchTickers('apple');

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.url).toBe('/search');
    expect(sentConfig.params).toEqual({ query: 'apple' });
  });

  it('fetches indicator data with the supplied properties', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => createResponse(config, {}));
    api.defaults.adapter = adapter;

    await fetchIndicatorData({ ticker: 'AAPL', indicator: 'SMA' });

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.url).toBe('/data/indicator');
    expect(sentConfig.params).toEqual({ ticker: 'AAPL', indicator: 'SMA' });
  });

  it('fetches the portfolio and returns the response payload', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) =>
      createResponse(config, { count: 0, positions: [] }),
    );
    api.defaults.adapter = adapter;

    const portfolio = await fetchPortfolio();

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.url).toBe('/portfolio');
    expect(portfolio).toEqual({ count: 0, positions: [] });
  });

  it('fetches user data from /user-data', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => createResponse(config, { balance: 10 }));
    api.defaults.adapter = adapter;

    const user = await fetchUserData();

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.url).toBe('/user-data');
    expect(user).toEqual({ balance: 10 });
  });

  it('fetches trade history', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => createResponse(config, []));
    api.defaults.adapter = adapter;

    await fetchTradeHistory();

    expect(adapter.mock.calls[0][0].url).toBe('/trade-history');
  });

  it('fetches the watchlist', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => createResponse(config, []));
    api.defaults.adapter = adapter;

    await fetchWatchlist();

    expect(adapter.mock.calls[0][0].url).toBe('/user-watchlist');
  });

  it('adds a symbol to the watchlist', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) =>
      createResponse(config, { success: true }),
    );
    api.defaults.adapter = adapter;

    const result = await addToWatchlist('AAPL');

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.method).toBe('post');
    expect(sentConfig.url).toBe('/user-watchlist/add');
    expect(readJsonBody(sentConfig)).toEqual({ symbol: 'AAPL' });
    expect(result).toEqual({ success: true });
  });

  it('deletes a symbol from the watchlist', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) =>
      createResponse(config, { success: true }),
    );
    api.defaults.adapter = adapter;

    await deleteFromWatchlist('AAPL');

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.method).toBe('delete');
    expect(sentConfig.url).toBe('/user-watchlist/delete');
    expect(readJsonBody(sentConfig)).toEqual({ symbol: 'AAPL' });
  });

  it('fetches stop losses and optionally filters by symbol', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => createResponse(config, []));
    api.defaults.adapter = adapter;

    await fetchActiveStopLosses();
    expect(adapter.mock.calls[0][0].url).toBe('/stopLoss');
    expect(adapter.mock.calls[0][0].params).toEqual({});

    await fetchActiveStopLosses('AAPL');
    expect(adapter.mock.calls[1][0].params).toEqual({ symbol: 'AAPL' });
  });

  it('cancels a stop loss by id', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) =>
      createResponse(config, { message: 'Stop loss cancelled' }),
    );
    api.defaults.adapter = adapter;

    await cancelStopLoss('stop-1');

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.method).toBe('delete');
    expect(sentConfig.url).toBe('/stopLoss/stop-1');
  });

  it('executes a buy order with symbol, quantity and side', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) =>
      createResponse(config, { success: true, message: 'Buy order executed' }),
    );
    api.defaults.adapter = adapter;

    await executeBuy('AAPL', 5);

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.method).toBe('post');
    expect(sentConfig.url).toBe('/buy');
    expect(readJsonBody(sentConfig)).toEqual({ symbol: 'AAPL', qty: 5, side: 'buy' });
  });

  it('executes a sell order with symbol, quantity and side', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) =>
      createResponse(config, { success: true, message: 'Sell order executed' }),
    );
    api.defaults.adapter = adapter;

    await executeSell('AAPL', 3);

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.url).toBe('/sell');
    expect(readJsonBody(sentConfig)).toEqual({ symbol: 'AAPL', qty: 3, side: 'sell' });
  });

  it('places a stop loss order with the supplied body', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) =>
      createResponse(config, { message: 'Stop loss order placed.' }),
    );
    api.defaults.adapter = adapter;

    await placeStopLoss({
      symbol: 'AAPL',
      price: 100,
      startDate: '2026-01-01T00:00:00.000Z',
      qty: 2,
      type: 'sell',
    });

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.method).toBe('post');
    expect(sentConfig.url).toBe('/stopLoss');
    expect(readJsonBody(sentConfig)).toEqual({
      symbol: 'AAPL',
      price: 100,
      startDate: '2026-01-01T00:00:00.000Z',
      qty: 2,
      type: 'sell',
    });
  });
});
