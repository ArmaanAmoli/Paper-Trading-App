import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { fetchActiveStopLosses } from '../services/api';
import type { GetStopLossResponse } from '@shared/contract/trade';
import type * as ApiModule from '../services/api';
import StockMainChart from './stockChart';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return {
    ...actual,
    fetchActiveStopLosses: vi.fn(),
  };
});

vi.mock('../Components/Charts/candlestick', () => ({
  default: ({ ticker, interval }: { ticker?: string; interval: string }) => (
    <div data-testid="candlestick" data-ticker={ticker} data-interval={interval} />
  ),
}));

vi.mock('../Components/Watchlist', () => ({
  default: () => <div data-testid="watchlist-panel" />,
}));

vi.mock('../Components/OrderForm', () => ({
  default: () => <div data-testid="order-form" />,
}));

vi.mock('../Components/IndicatorPopUps/IndicatorModal', () => ({
  default: ({ indicatorConfig }: { indicatorConfig: { title: string } | null }) => (
    <div data-testid="indicator-modal">{indicatorConfig?.title ?? 'no-config'}</div>
  ),
}));

const mockedFetchActiveStopLosses = vi.mocked(fetchActiveStopLosses);

const stopLossFixture: GetStopLossResponse = [
  {
    _id: 'sl-1',
    userId: 'user-1',
    symbol: 'AAPL',
    price: 90,
    startDate: '2026-01-01T00:00:00.000Z',
    type: 'sell',
    qty: 3,
  },
];

function renderStockChart(ticker = 'AAPL') {
  const router = createMemoryRouter([{ path: '/chart/:ticker', element: <StockMainChart /> }], {
    initialEntries: [`/chart/${ticker}`],
  });

  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  mockedFetchActiveStopLosses.mockReset();
  mockedFetchActiveStopLosses.mockResolvedValue(stopLossFixture);
});

describe('StockMainChart', () => {
  it('renders the chart with the ticker from the route', async () => {
    renderStockChart('AAPL');

    const chart = await screen.findByTestId('candlestick');
    expect(chart).toHaveAttribute('data-ticker', 'AAPL');
    expect(chart).toHaveAttribute('data-interval', '1h');
  });

  it('loads the active stop losses for the current symbol', async () => {
    renderStockChart('AAPL');

    await waitFor(() => {
      expect(mockedFetchActiveStopLosses).toHaveBeenCalledWith('AAPL');
    });
  });

  it('changes the interval used by the chart', async () => {
    const user = userEvent.setup();
    renderStockChart('AAPL');

    await screen.findByTestId('candlestick');
    await user.click(screen.getByRole('button', { name: '1d' }));

    await waitFor(() => {
      expect(screen.getByTestId('candlestick')).toHaveAttribute('data-interval', '1d');
    });
    expect(screen.getByRole('button', { name: '1d' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the order panel by default and switches to the watchlist panel', async () => {
    const user = userEvent.setup();
    renderStockChart('AAPL');

    const orderTab = screen.getByRole('tab', { name: 'Order' });
    const watchlistTab = screen.getByRole('tab', { name: 'Watchlist' });

    expect(orderTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('order-form')).toBeInTheDocument();

    await user.click(watchlistTab);

    expect(watchlistTab).toHaveAttribute('aria-selected', 'true');
    expect(orderTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('watchlist-panel')).toBeInTheDocument();
  });

  it('opens the indicator modal for the selected indicator', async () => {
    const user = userEvent.setup();
    renderStockChart('AAPL');

    await user.click(screen.getByRole('button', { name: 'Indicators menu' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Moving Average/ }));

    await waitFor(() => {
      expect(screen.getByTestId('indicator-modal')).toHaveTextContent('Moving Average');
    });
  });
});
