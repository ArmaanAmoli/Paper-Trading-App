import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WatchlistContext } from '../Context/context';
import SearchResultComponent from './searchResultComponent';
import { addToWatchlist } from '../services/watchlist';

vi.mock('../services/watchlist', () => ({
  addToWatchlist: vi.fn(),
}));

const mockedAddToWatchlist = vi.mocked(addToWatchlist);

beforeEach(() => {
  mockedAddToWatchlist.mockReset();
});

describe('SearchResultComponent', () => {
  it('renders the symbol details', () => {
    render(
      <SearchResultComponent
        info={{ symbol: 'AAPL', shortname: 'Apple Inc.', typeDisp: 'EQUITY', exchange: 'NMS' }}
      />,
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('EQUITY')).toBeInTheDocument();
    expect(screen.getByText('NMS')).toBeInTheDocument();
  });

  it('renders nothing when no symbol information is provided', () => {
    const { container } = render(<SearchResultComponent info={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('adds the symbol to the watchlist and updates the context list', async () => {
    const user = userEvent.setup();
    mockedAddToWatchlist.mockResolvedValue({ success: true });

    const setWatchlistArray = vi.fn();

    render(
      <WatchlistContext.Provider
        value={{
          watchlistArrayState: [['AAPL'], setWatchlistArray],
          watchlistMap: new Map(),
        }}
      >
        <SearchResultComponent info={{ symbol: 'MSFT' }} />
      </WatchlistContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Add MSFT to watchlist' }));

    expect(mockedAddToWatchlist).toHaveBeenCalledWith('MSFT');
    await waitFor(() => {
      expect(setWatchlistArray).toHaveBeenCalledTimes(1);
    });

    const updater = setWatchlistArray.mock.calls[0][0] as (previous: string[]) => string[];
    expect(updater(['AAPL'])).toEqual(['AAPL', 'MSFT']);
  });

  it('does not update the watchlist when the add request fails', async () => {
    const user = userEvent.setup();
    mockedAddToWatchlist.mockResolvedValue({ success: false });

    const setWatchlistArray = vi.fn();

    render(
      <WatchlistContext.Provider
        value={{
          watchlistArrayState: [['AAPL'], setWatchlistArray],
          watchlistMap: new Map(),
        }}
      >
        <SearchResultComponent info={{ symbol: 'MSFT' }} />
      </WatchlistContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Add MSFT to watchlist' }));

    expect(mockedAddToWatchlist).toHaveBeenCalledWith('MSFT');
    expect(setWatchlistArray).not.toHaveBeenCalled();
  });
});
