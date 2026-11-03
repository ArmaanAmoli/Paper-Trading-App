import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import api from '../services/api';
import { getTradeHistory } from './tradeHistory';

vi.mock('../services/api', () => ({
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

describe('getTradeHistory (GetData)', () => {
  it('returns the trade history payload', async () => {
    mockedApi.get.mockResolvedValue(createResponse([{ _id: 'trade-1' }]));

    const result = await getTradeHistory();

    expect(mockedApi.get).toHaveBeenCalledWith('/trade-history');
    expect(result).toEqual([{ _id: 'trade-1' }]);
  });

  it('returns false when the request fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('network down'));

    const result = await getTradeHistory();

    expect(result).toBe(false);
  });
});
