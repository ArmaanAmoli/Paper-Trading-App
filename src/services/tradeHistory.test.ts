import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import api from './api';
import { getTradeHistory } from './tradeHistory';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

function createResponse<T>(data: T): AxiosResponse<T> {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

beforeEach(() => {
  mockedApi.get.mockReset();
});

describe('getTradeHistory', () => {
  it('returns the trade history from the server', async () => {
    const trades = [
      {
        _id: 'trade-1',
        userId: 'user-1',
        symbol: 'AAPL',
        shares: 10,
        price: 150,
        type: 'buy',
        timestamp: '2026-01-01T00:00:00.000Z',
        realizedPL: 0,
        orderId: 'order-1',
        wasStopLoss: false,
      },
    ];
    mockedApi.get.mockResolvedValue(createResponse(trades));

    const result = await getTradeHistory();

    expect(mockedApi.get).toHaveBeenCalledWith('/trade-history');
    expect(result).toEqual(trades);
  });

  it('rethrows the error when the request fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('network down'));

    await expect(getTradeHistory()).rejects.toThrow('network down');
  });
});
