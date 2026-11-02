import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { MarketData } from '../Context/context';
import type { MarketDataContextValue } from '../Context/context';
import Market from './market';

const marketData: MarketDataContextValue = {
  marketDataMap: new Map([
    ['^GSPC', { currentPrice: 5234.56, change: 12.345, percentChange: 0.2367 }],
  ]),
};

function renderMarket() {
  const router = createMemoryRouter(
    [
      { path: '/landing-page', element: <Market /> },
      { path: '/chart/:ticker', element: <p>Chart page</p> },
    ],
    { initialEntries: ['/landing-page'] },
  );

  render(
    <MarketData.Provider value={marketData}>
      <RouterProvider router={router} />
    </MarketData.Provider>,
  );

  return router;
}

describe('Market', () => {
  it('renders the market table header', () => {
    renderMarket();

    expect(screen.getByText('Markets Today')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Index' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Symbol' })).toBeInTheDocument();
  });

  it('renders the quote for each indexed symbol', () => {
    renderMarket();

    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('^GSPC')).toBeInTheDocument();
    expect(screen.getByText('5,234.56')).toBeInTheDocument();
    expect(screen.getByText('+12.35')).toBeInTheDocument();
    expect(screen.getByText('+0.24%')).toBeInTheDocument();
  });

  it('does not render rows for symbols without a quote', () => {
    renderMarket();

    expect(screen.queryByText('Dow Jones Industrial Average')).not.toBeInTheDocument();
  });

  it('navigates to the chart page when a row is clicked', async () => {
    const user = userEvent.setup();
    const router = renderMarket();

    await user.click(screen.getByText('^GSPC'));

    await waitFor(() => {
      expect(decodeURIComponent(router.state.location.pathname)).toBe('/chart/^GSPC');
    });
  });

  it('navigates to the chart page when a row is activated with the keyboard', async () => {
    const user = userEvent.setup();
    const router = renderMarket();

    await user.tab();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(decodeURIComponent(router.state.location.pathname)).toBe('/chart/^GSPC');
    });
  });
});
