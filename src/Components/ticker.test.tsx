import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type React from 'react';
import { WatchlistContext } from '../Context/context';
import { deleteFromWatchlist } from '../services/watchlist';
import type * as WatchlistService from '../services/watchlist';
import Ticker from './ticker';

vi.mock('../services/watchlist', async (importOriginal) => {
  const actual = await importOriginal<typeof WatchlistService>();
  return {
    ...actual,
    deleteFromWatchlist: vi.fn(),
  };
});

const mockedDeleteFromWatchlist = vi.mocked(deleteFromWatchlist);

type Quote = { currentPrice: number; change: number; percentChange: number };

function buildQuoteMap(quote?: Quote): Map<string, Quote> {
  const map = new Map<string, Quote>();
  if (quote) map.set('AAPL', quote);
  return map;
}

function renderTicker(options?: {
  quote?: Quote | undefined;
  setSymbols?: (updater: (prev: string[]) => string[]) => string[];
}) {
  const setSymbols =
    options?.setSymbols ?? vi.fn((updater: (prev: string[]) => string[]) => updater(['AAPL']));

  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Watchlist page</p> },
      {
        path: '/chart/:ticker',
        element: <p>Chart page</p>,
      },
      {
        path: '/ticker',
        element: (
          <table>
            <tbody>
              <Ticker name="AAPL" />
            </tbody>
          </table>
        ),
      },
    ],
    { initialEntries: ['/ticker'] },
  );

  render(
    <WatchlistContext.Provider
      value={{
        watchlistArrayState: [
          ['AAPL'],
          setSymbols as unknown as React.Dispatch<React.SetStateAction<string[]>>,
        ],
        watchlistMap: buildQuoteMap(options?.quote),
      }}
    >
      <RouterProvider router={router} />
    </WatchlistContext.Provider>,
  );

  return { router, setSymbols };
}

beforeEach(() => {
  mockedDeleteFromWatchlist.mockReset();
  mockedDeleteFromWatchlist.mockResolvedValue({ success: true });
});

describe('Ticker', () => {
  it('renders a loading row while the quote is not available', () => {
    renderTicker();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the symbol, price and change for the quote', () => {
    renderTicker({ quote: { currentPrice: 195.5, change: 3.25, percentChange: 1.7 } });

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('195.5')).toBeInTheDocument();
    expect(screen.getByText('+3.25')).toBeInTheDocument();
    expect(screen.getByText('+1.70%')).toBeInTheDocument();
  });

  it('renders a negative change without a plus sign', () => {
    renderTicker({ quote: { currentPrice: 90.25, change: -2.5, percentChange: -2.7 } });

    expect(screen.getByText('-2.50')).toBeInTheDocument();
    expect(screen.getByText('-2.70%')).toBeInTheDocument();
  });

  it('navigates to the chart page when the row is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderTicker({
      quote: { currentPrice: 195.5, change: 3.25, percentChange: 1.7 },
    });

    await user.click(screen.getByText('AAPL'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/chart/AAPL');
    });
  });

  it('removes the symbol from the watchlist when the delete request succeeds', async () => {
    const setSymbols = vi.fn((updater: (prev: string[]) => string[]) => updater(['AAPL']));
    renderTicker({
      quote: { currentPrice: 195.5, change: 3.25, percentChange: 1.7 },
      setSymbols,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove AAPL from watchlist' }));

    await waitFor(() => {
      expect(mockedDeleteFromWatchlist).toHaveBeenCalledWith('AAPL');
    });
    expect(setSymbols).toHaveBeenCalledTimes(1);
    expect(setSymbols.mock.results[0]?.value).toEqual([]);
  });

  it('keeps the symbol in the watchlist when the delete request fails', async () => {
    mockedDeleteFromWatchlist.mockResolvedValue({ success: false });
    const setSymbols = vi.fn((updater: (prev: string[]) => string[]) => updater(['AAPL']));
    renderTicker({
      quote: { currentPrice: 195.5, change: 3.25, percentChange: 1.7 },
      setSymbols,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove AAPL from watchlist' }));

    await waitFor(() => {
      expect(mockedDeleteFromWatchlist).toHaveBeenCalledWith('AAPL');
    });
    expect(setSymbols).not.toHaveBeenCalled();
  });
});
