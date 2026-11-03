import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContext } from 'react';
import { WatchlistContext } from './context';
import { WatchlistProvider } from './contextProviders';
import { getWatchlist } from '../services/watchlist';
import { wsManager } from '../lib/wsManager';

vi.mock('../services/watchlist', () => ({
  getWatchlist: vi.fn(),
}));

vi.mock('../lib/wsManager', () => ({
  wsManager: {
    subscriber: vi.fn(),
    unsubscriber: vi.fn(),
  },
}));

const mockedGetWatchlist = vi.mocked(getWatchlist);
const mockedWsManager = vi.mocked(wsManager);

function Probe() {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error('WatchlistContext is missing');

  const [symbols, setSymbols] = context.watchlistArrayState;
  const quote = context.watchlistMap.get('AAPL');

  return (
    <div>
      <span data-testid="symbols">{symbols.join(',')}</span>
      <span data-testid="price">{quote ? quote.currentPrice : 'none'}</span>
      <span data-testid="change">{quote ? quote.change : 'none'}</span>
      <button type="button" onClick={() => setSymbols((previous) => [...previous, 'TSLA'])}>
        add symbol
      </button>
    </div>
  );
}

beforeEach(() => {
  mockedGetWatchlist.mockReset();
  mockedWsManager.subscriber.mockReset();
  mockedWsManager.unsubscriber.mockReset();
});

describe('WatchlistProvider', () => {
  it('loads the watchlist symbols from the server', async () => {
    mockedGetWatchlist.mockResolvedValue({
      _id: 'watch-1',
      userId: 'user-1',
      symbols: ['AAPL', 'MSFT'],
    });

    render(
      <WatchlistProvider>
        <Probe />
      </WatchlistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('symbols')).toHaveTextContent('AAPL,MSFT');
    });
  });

  it('keeps the watchlist empty when the request fails', async () => {
    mockedGetWatchlist.mockResolvedValue({ _id: '', userId: '', symbols: [] });

    render(
      <WatchlistProvider>
        <Probe />
      </WatchlistProvider>,
    );

    await waitFor(() => {
      expect(mockedGetWatchlist).toHaveBeenCalled();
    });
    expect(screen.getByTestId('symbols')).toHaveTextContent('');
  });

  it('subscribes to the quote stream for every symbol in the watchlist', async () => {
    mockedGetWatchlist.mockResolvedValue({
      _id: 'watch-1',
      userId: 'user-1',
      symbols: ['AAPL', 'MSFT'],
    });

    render(
      <WatchlistProvider>
        <Probe />
      </WatchlistProvider>,
    );

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalledTimes(2);
    });

    const subscribedTickers = mockedWsManager.subscriber.mock.calls.map((call) => call[1]);
    expect(subscribedTickers).toEqual(['AAPL', 'MSFT']);
    expect(mockedWsManager.subscriber.mock.calls[0][0]).toBe('quote');
  });

  it('updates the quote map when a quote message arrives', async () => {
    mockedGetWatchlist.mockResolvedValue({ _id: 'watch-1', userId: 'user-1', symbols: ['AAPL'] });

    render(
      <WatchlistProvider>
        <Probe />
      </WatchlistProvider>,
    );

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalledTimes(1);
    });

    const handler = mockedWsManager.subscriber.mock.calls[0][2];

    await act(async () => {
      handler({
        ticker: 'AAPL',
        currentPrice: 195.5,
        change: 3.25,
        percentChange: 1.7,
      });
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

    expect(screen.getByTestId('price')).toHaveTextContent('195.5');
    expect(screen.getByTestId('change')).toHaveTextContent('3.25');
  });

  it('ignores quote messages that do not carry quote fields', async () => {
    mockedGetWatchlist.mockResolvedValue({ _id: 'watch-1', userId: 'user-1', symbols: ['AAPL'] });

    render(
      <WatchlistProvider>
        <Probe />
      </WatchlistProvider>,
    );

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalledTimes(1);
    });

    const handler = mockedWsManager.subscriber.mock.calls[0][2];

    await act(async () => {
      handler({ ticker: 'AAPL', indicator: 'SMA', interval: '1d' });
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

    expect(screen.getByTestId('price')).toHaveTextContent('none');
  });

  it('unsubscribes from the quote stream on unmount', async () => {
    mockedGetWatchlist.mockResolvedValue({ _id: 'watch-1', userId: 'user-1', symbols: ['AAPL'] });

    const { unmount } = render(
      <WatchlistProvider>
        <Probe />
      </WatchlistProvider>,
    );

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(mockedWsManager.unsubscriber).toHaveBeenCalledTimes(1);
    expect(mockedWsManager.unsubscriber.mock.calls[0][1]).toBe('AAPL');
  });

  it('exposes a setter that can add symbols to the watchlist', async () => {
    mockedGetWatchlist.mockResolvedValue({ _id: 'watch-1', userId: 'user-1', symbols: ['AAPL'] });

    render(
      <WatchlistProvider>
        <Probe />
      </WatchlistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('symbols')).toHaveTextContent('AAPL');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'add symbol' }).click();
    });

    expect(screen.getByTestId('symbols')).toHaveTextContent('AAPL,TSLA');
  });
});
