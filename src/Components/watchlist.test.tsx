import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WatchlistContext } from '../Context/context';
import Watchlist from './Watchlist';

vi.mock('../services/watchlist', () => ({
  deleteFromWatchlist: vi.fn().mockResolvedValue({ success: true }),
  addToWatchlist: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Watchlist', () => {
  it('shows an empty state when there are no symbols', () => {
    render(
      <MemoryRouter>
        <WatchlistContext.Provider
          value={{ watchlistArrayState: [[], vi.fn()], watchlistMap: new Map() }}
        >
          <Watchlist />
        </WatchlistContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByText('No symbols in watchlist. Click + to add.')).toBeInTheDocument();
  });

  it('renders a loading row for a symbol without a quote yet', () => {
    render(
      <MemoryRouter>
        <WatchlistContext.Provider
          value={{ watchlistArrayState: [['AAPL'], vi.fn()], watchlistMap: new Map() }}
        >
          <Watchlist />
        </WatchlistContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the quote data for a symbol', () => {
    render(
      <MemoryRouter>
        <WatchlistContext.Provider
          value={{
            watchlistArrayState: [['AAPL'], vi.fn()],
            watchlistMap: new Map([
              ['AAPL', { currentPrice: 195.5, change: 3.25, percentChange: 1.7 }],
            ]),
          }}
        >
          <Watchlist />
        </WatchlistContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('195.5')).toBeInTheDocument();
    expect(screen.getByText('+3.25')).toBeInTheDocument();
    expect(screen.getByText('+1.70%')).toBeInTheDocument();
  });

  it('opens the search dialog when the add button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WatchlistContext.Provider
          value={{ watchlistArrayState: [[], vi.fn()], watchlistMap: new Map() }}
        >
          <Watchlist />
        </WatchlistContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add symbol to watchlist' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Search symbols')).toBeInTheDocument();
  });
});
