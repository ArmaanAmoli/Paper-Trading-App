import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import api from './api';
import { addToWatchlist, deleteFromWatchlist, getWatchlist } from './watchlist';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

function createResponse<T>(data: T): AxiosResponse<T> {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

beforeEach(() => {
  mockedApi.get.mockReset();
  mockedApi.post.mockReset();
  mockedApi.delete.mockReset();
});

describe('getWatchlist', () => {
  it('returns the symbols of the first watchlist document', async () => {
    mockedApi.get.mockResolvedValue(
      createResponse([{ _id: 'watch-1', userId: 'user-1', symbols: ['AAPL', 'MSFT'] }]),
    );

    const result = await getWatchlist();

    expect(mockedApi.get).toHaveBeenCalledWith('/user-watchlist');
    expect(result).toEqual({ _id: 'watch-1', userId: 'user-1', symbols: ['AAPL', 'MSFT'] });
  });

  it('returns an empty watchlist when the response has no documents', async () => {
    mockedApi.get.mockResolvedValue(createResponse([]));

    const result = await getWatchlist();

    expect(result).toEqual({ _id: '', userId: '', symbols: [] });
  });

  it('returns an empty watchlist when the request fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('network down'));

    const result = await getWatchlist();

    expect(result).toEqual({ _id: '', userId: '', symbols: [] });
  });
});

describe('addToWatchlist', () => {
  it('posts the symbol to the add endpoint and returns the response', async () => {
    mockedApi.post.mockResolvedValue(createResponse({ success: true }));

    const result = await addToWatchlist('AAPL');

    expect(mockedApi.post).toHaveBeenCalledWith('/user-watchlist/add', { symbol: 'AAPL' });
    expect(result).toEqual({ success: true });
  });

  it('rethrows the error when the request fails', async () => {
    mockedApi.post.mockRejectedValue(new Error('failed'));

    await expect(addToWatchlist('AAPL')).rejects.toThrow('failed');
  });
});

describe('deleteFromWatchlist', () => {
  it('deletes the symbol from the watchlist endpoint', async () => {
    mockedApi.delete.mockResolvedValue(createResponse({ success: true }));

    const result = await deleteFromWatchlist('AAPL');

    expect(mockedApi.delete).toHaveBeenCalledWith('/user-watchlist/delete', {
      data: { symbol: 'AAPL' },
    });
    expect(result).toEqual({ success: true });
  });

  it('rethrows the error when the request fails', async () => {
    mockedApi.delete.mockRejectedValue(new Error('failed'));

    await expect(deleteFromWatchlist('AAPL')).rejects.toThrow('failed');
  });
});
