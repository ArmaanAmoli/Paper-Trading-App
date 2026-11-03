import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import api from './api';
import { placeOrder } from './placeOrder';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('../assets/sound/position-sound.mp3', () => ({
  default: 'position-sound.mp3',
}));

const mockedApi = vi.mocked(api);

function createResponse<T>(data: T): AxiosResponse<T> {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

class AudioStub {
  play = vi.fn().mockResolvedValue(undefined);
}

beforeEach(() => {
  mockedApi.post.mockReset();
  vi.stubGlobal('Audio', AudioStub);
});

describe('placeOrder', () => {
  it('executes a buy order and reports a successful trade', async () => {
    mockedApi.post.mockResolvedValue(
      createResponse({ success: true, message: 'Buy order executed' }),
    );

    const result = await placeOrder('AAPL', 5, 'buy', null);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/buy', { symbol: 'AAPL', qty: 5, side: 'buy' });
    expect(result.trade).toEqual({
      success: true,
      data: { success: true, message: 'Buy order executed' },
      error: null,
    });
    expect(result.stopLoss.success).toBe(false);
    expect(result.stopLoss.data).toBeNull();
    expect(result.stopLoss.error).toBeNull();
  });

  it('executes a sell order against the sell endpoint', async () => {
    mockedApi.post.mockResolvedValue(
      createResponse({ success: true, message: 'Sell order executed' }),
    );

    const result = await placeOrder('AAPL', 2, 'sell', null);

    expect(mockedApi.post).toHaveBeenCalledWith('/sell', { symbol: 'AAPL', qty: 2, side: 'sell' });
    expect(result.trade.success).toBe(true);
  });

  it('reports the server message when the trade request fails', async () => {
    mockedApi.post.mockRejectedValue({
      response: { data: { message: 'Insufficient funds' } },
      message: 'Request failed with status code 422',
    });

    const result = await placeOrder('AAPL', 5, 'buy', null);

    expect(result.trade.success).toBe(false);
    expect(result.trade.data).toBeNull();
    expect(result.trade.error).toBe('Insufficient funds');
  });

  it('falls back to the error message when the failure has no server message', async () => {
    mockedApi.post.mockRejectedValue(new Error('Network Error'));

    const result = await placeOrder('AAPL', 5, 'buy', null);

    expect(result.trade.success).toBe(false);
    expect(result.trade.error).toBe('Network Error');
  });

  it('places the stop loss order after a successful trade', async () => {
    mockedApi.post
      .mockResolvedValueOnce(createResponse({ success: true, message: 'Buy order executed' }))
      .mockResolvedValueOnce(createResponse({ message: 'Stop loss order placed.' }));

    const result = await placeOrder('AAPL', 5, 'buy', {
      symbol: 'AAPL',
      price: 100,
      startDate: '2026-01-01T00:00:00.000Z',
      qty: 2,
      type: 'sell',
    });

    expect(mockedApi.post).toHaveBeenCalledTimes(2);
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/stopLoss', {
      symbol: 'AAPL',
      price: 100,
      startDate: '2026-01-01T00:00:00.000Z',
      qty: 2,
      type: 'sell',
    });
    expect(result.trade.success).toBe(true);
    expect(result.stopLoss.success).toBe(true);
    expect(result.stopLoss.error).toBeNull();
  });

  it('reports an unexpected stop loss response', async () => {
    mockedApi.post
      .mockResolvedValueOnce(createResponse({ success: true, message: 'Buy order executed' }))
      .mockResolvedValueOnce(createResponse({}));

    const result = await placeOrder('AAPL', 5, 'buy', {
      symbol: 'AAPL',
      price: 100,
      startDate: '2026-01-01T00:00:00.000Z',
      qty: 2,
      type: 'sell',
    });

    expect(result.stopLoss.success).toBe(false);
    expect(result.stopLoss.error).toBe('Unexpected stop loss response');
  });

  it('reports the server message when the stop loss request fails', async () => {
    mockedApi.post
      .mockResolvedValueOnce(createResponse({ success: true, message: 'Buy order executed' }))
      .mockRejectedValueOnce({ response: { data: { message: 'Stop loss not found' } } });

    const result = await placeOrder('AAPL', 5, 'buy', {
      symbol: 'AAPL',
      price: 100,
      startDate: '2026-01-01T00:00:00.000Z',
      qty: 2,
      type: 'sell',
    });

    expect(result.stopLoss.success).toBe(false);
    expect(result.stopLoss.error).toBe('Stop loss not found');
  });

  it('skips the stop loss request when no stop loss order is supplied', async () => {
    mockedApi.post.mockResolvedValue(
      createResponse({ success: true, message: 'Buy order executed' }),
    );

    await placeOrder('AAPL', 5, 'buy', null);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
  });
});
