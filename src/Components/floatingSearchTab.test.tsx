import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import SearchTabPopUp from './floatingSearchTab';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('./searchResultComponent', () => ({
  default: ({ info }: { info: { symbol: string } }) => (
    <div data-testid="search-result">{info.symbol}</div>
  ),
}));

const mockedGet = vi.mocked(api.get);

function renderSearchTab(close = vi.fn()) {
  render(<SearchTabPopUp close={close} />);
  return close;
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockResolvedValue({ data: [] });
});

describe('SearchTabPopUp', () => {
  it('renders the search dialog with an empty query', () => {
    renderSearchTab();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
    expect(screen.getByLabelText('Search symbols')).toHaveFocus();
    expect(screen.getByText('Type a symbol to search')).toBeInTheDocument();
  });

  it('keeps the search button disabled until a query is typed', async () => {
    const user = userEvent.setup();
    renderSearchTab();

    const searchButton = screen.getByRole('button', { name: 'Search' });
    expect(searchButton).toBeDisabled();

    await user.type(screen.getByLabelText('Search symbols'), 'AAPL');
    expect(searchButton).toBeEnabled();
  });

  it('requests the search endpoint with the typed query', async () => {
    const user = userEvent.setup();
    renderSearchTab();

    await user.type(screen.getByLabelText('Search symbols'), 'AAPL');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/search', { params: { query: 'AAPL' } });
    });
  });

  it('searches when the enter key is pressed', async () => {
    const user = userEvent.setup();
    renderSearchTab();

    await user.type(screen.getByLabelText('Search symbols'), 'TSLA{Enter}');

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/search', { params: { query: 'TSLA' } });
    });
  });

  it('renders the search results', async () => {
    const user = userEvent.setup();
    mockedGet.mockResolvedValue({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] });

    renderSearchTab();
    await user.type(screen.getByLabelText('Search symbols'), 'A');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getAllByTestId('search-result')).toHaveLength(2);
  });

  it('shows a message when no results are found', async () => {
    const user = userEvent.setup();

    renderSearchTab();
    await user.type(screen.getByLabelText('Search symbols'), 'ZZZZ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('No results found for "ZZZZ"')).toBeInTheDocument();
    });
  });

  it('ignores a blank query', async () => {
    const user = userEvent.setup();

    renderSearchTab();
    await user.type(screen.getByLabelText('Search symbols'), '   ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('closes when the escape key is pressed', async () => {
    const user = userEvent.setup();
    const close = renderSearchTab();

    await user.type(screen.getByLabelText('Search symbols'), '{Escape}');

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes when the close button is pressed', async () => {
    const user = userEvent.setup();
    const close = renderSearchTab();

    await user.click(screen.getByRole('button', { name: 'Close search' }));

    expect(close).toHaveBeenCalledTimes(1);
  });
});
