import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContext } from 'react';
import { MarketData } from './context';
import MarketDataProvider from './MarketPageContextProvider';
import { wsManager } from '../lib/wsManager';

vi.mock('../lib/wsManager', () => ({
  wsManager: {
    subscriber: vi.fn(),
    unsubscriber: vi.fn(),
  },
}));

const mockedWsManager = vi.mocked(wsManager);

function Probe() {
  const context = useContext(MarketData);
  if (!context) throw new Error('MarketData context is missing');

  // The provider only subscribes to the index symbols, so the probe reports
  // whichever quote was stored instead of assuming a fixed ticker.
  const firstEntry = context.marketDataMap.entries().next().value;
  const quote = firstEntry?.[1];

  return (
    <div>
      <span data-testid="count">{context.marketDataMap.size}</span>
      <span data-testid="ticker">{firstEntry?.[0] ?? 'none'}</span>
      <span data-testid="price">{quote ? quote.currentPrice : 'none'}</span>
      <span data-testid="change">{quote ? quote.change : 'none'}</span>
    </div>
  );
}

beforeEach(() => {
  mockedWsManager.subscriber.mockReset();
  mockedWsManager.unsubscriber.mockReset();
});

describe('MarketDataProvider', () => {
  it('starts with an empty market data map', () => {
    render(
      <MarketDataProvider>
        <Probe />
      </MarketDataProvider>,
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('subscribes to the quote stream for the index symbols', async () => {
    render(
      <MarketDataProvider>
        <Probe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalled();
    });

    expect(mockedWsManager.subscriber.mock.calls[0][0]).toBe('quote');
    expect(mockedWsManager.subscriber.mock.calls.length).toBeGreaterThan(1);
  });

  it('stores the quote data when a quote message arrives', async () => {
    render(
      <MarketDataProvider>
        <Probe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalled();
    });

    const ticker = mockedWsManager.subscriber.mock.calls[0][1];
    const handler = mockedWsManager.subscriber.mock.calls[0][2];

    await act(async () => {
      handler({
        ticker,
        currentPrice: 123.45,
        change: 1.5,
        percentChange: 1.2,
      });
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    // The quote is stored under the subscribed symbol.
    expect(screen.getByTestId('ticker')).toHaveTextContent(ticker);
    expect(screen.getByTestId('price')).toHaveTextContent('123.45');
    expect(screen.getByTestId('change')).toHaveTextContent('1.5');
  });

  it('ignores messages that are not quotes', async () => {
    render(
      <MarketDataProvider>
        <Probe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalled();
    });

    const handler = mockedWsManager.subscriber.mock.calls[0][2];

    await act(async () => {
      handler({ ticker: 'AAPL', indicator: 'SMA', interval: '1d' });
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('unsubscribes from every symbol on unmount', async () => {
    const { unmount } = render(
      <MarketDataProvider>
        <Probe />
      </MarketDataProvider>,
    );

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalled();
    });

    const subscribeCount = mockedWsManager.subscriber.mock.calls.length;

    unmount();

    expect(mockedWsManager.unsubscriber).toHaveBeenCalledTimes(subscribeCount);
  });
});
