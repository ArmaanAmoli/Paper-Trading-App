import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserAccountContext, UserEquityContext } from '../Context/context';
import type { UserAccountContextValue, UserEquityContextValue } from '../Context/context';
import { fetchActiveStopLosses, cancelStopLoss } from '../services/api';
import type { GetStopLossResponse } from '@shared/contract/trade';
import type * as ApiModule from '../services/api';
import PortfolioPage from './portfolioPage';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return {
    ...actual,
    fetchActiveStopLosses: vi.fn(),
    cancelStopLoss: vi.fn(),
  };
});

const mockedFetchActiveStopLosses = vi.mocked(fetchActiveStopLosses);
const mockedCancelStopLoss = vi.mocked(cancelStopLoss);

const accountValue: UserAccountContextValue = {
  userAccountInformation: {
    _id: 'user-1',
    username: 'trader',
    email: 'trader@example.com',
    balance: 1000,
    blockedMargin: 250,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLogin: null,
    notificationSubscription: null,
  },
  setUserAccountInformation: vi.fn(),
};

const equityValue: UserEquityContextValue = {
  portfolio: [
    [
      {
        _id: 'position-1',
        userId: 'user-1',
        symbol: 'AAPL',
        shares: 10,
        avgPrice: 100,
        positionType: 'long',
        lastUpdated: '2026-01-01T00:00:00.000Z',
      },
      {
        _id: 'position-2',
        userId: 'user-1',
        symbol: 'TSLA',
        shares: -5,
        avgPrice: 200,
        positionType: 'short',
        lastUpdated: '2026-01-01T00:00:00.000Z',
      },
    ],
    vi.fn(),
  ],
  pnl: [
    {
      AAPL: { Pnl: '250.00', pChange: '12.50' },
      TSLA: { Pnl: '-100.00', pChange: '-10.00' },
    },
    vi.fn(),
  ],
  totalPnl: [150, vi.fn()],
  totalEquity: [2000, vi.fn()],
};

function renderPortfolio(options?: {
  account?: UserAccountContextValue;
  equity?: UserEquityContextValue;
}) {
  return render(
    <UserAccountContext.Provider value={options?.account ?? accountValue}>
      <UserEquityContext.Provider value={options?.equity ?? equityValue}>
        <PortfolioPage />
      </UserEquityContext.Provider>
    </UserAccountContext.Provider>,
  );
}

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

beforeEach(() => {
  mockedFetchActiveStopLosses.mockReset();
  mockedCancelStopLoss.mockReset();
  mockedFetchActiveStopLosses.mockResolvedValue(stopLossFixture);
  mockedCancelStopLoss.mockResolvedValue({ message: 'Stop loss cancelled' });
});

describe('PortfolioPage', () => {
  it('renders the account summary cards', async () => {
    renderPortfolio();

    expect(screen.getByText('Unrealized P&L')).toBeInTheDocument();
    expect(screen.getByText('+150.00')).toBeInTheDocument();
    expect(screen.getByText('Account Balance')).toBeInTheDocument();
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
    expect(screen.getByText('Equity')).toBeInTheDocument();
    // Balance (1000) + total equity (2000)
    expect(screen.getByText('3,000.00')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedFetchActiveStopLosses).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the open positions with their unrealized pnl', async () => {
    renderPortfolio();

    const rows = screen.getAllByRole('row');
    const aaplRow = rows.find((row) => within(row).queryByText('AAPL') !== null);
    expect(aaplRow).toBeDefined();

    if (!aaplRow) return;
    expect(within(aaplRow).getByText('LONG')).toBeInTheDocument();
    expect(within(aaplRow).getByText('10')).toBeInTheDocument();
    expect(within(aaplRow).getByText('+250.00')).toBeInTheDocument();
    expect(within(aaplRow).getByText('+12.50%')).toBeInTheDocument();

    const tslaRow = rows.find((row) => within(row).queryByText('TSLA') !== null);
    expect(tslaRow).toBeDefined();

    if (!tslaRow) return;
    expect(within(tslaRow).getByText('SHORT')).toBeInTheDocument();
    expect(within(tslaRow).getByText('5')).toBeInTheDocument();
    expect(within(tslaRow).getByText('-100.00')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    expect(within(tslaRow).getByText('-10.00%')).toBeInTheDocument();
  });

  it('shows a loading placeholder when the pnl for a position is not available yet', async () => {
    const equityWithoutPnl: UserEquityContextValue = {
      ...equityValue,
      pnl: [
        {
          AAPL: { Pnl: '250.00', pChange: '12.50' },
        },
        vi.fn(),
      ],
    };

    renderPortfolio({ equity: equityWithoutPnl });

    // Only TSLA is missing a pnl entry, so only its two cells show the placeholder.
    expect(screen.getAllByText('...').length).toBe(2);
    expect(screen.getByText('+250.00')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedFetchActiveStopLosses).toHaveBeenCalled();
    });
  });

  it('shows the empty state when there are no open positions', async () => {
    const emptyEquity: UserEquityContextValue = {
      ...equityValue,
      portfolio: [[], vi.fn()],
      pnl: [{}, vi.fn()],
      totalPnl: [0, vi.fn()],
      totalEquity: [0, vi.fn()],
    };

    renderPortfolio({ equity: emptyEquity });

    expect(screen.getByText('No open positions yet')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedFetchActiveStopLosses).toHaveBeenCalled();
    });
  });

  it('renders the active stop losses', async () => {
    renderPortfolio();

    await waitFor(() => {
      expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    });

    const stopLossRows = screen
      .getAllByRole('row')
      .filter((row) => within(row).queryByText('AAPL') !== null);
    const stopLossRow = stopLossRows[stopLossRows.length - 1];

    expect(within(stopLossRow).getByText('SHORT')).toBeInTheDocument();
    expect(within(stopLossRow).getByText('3.00')).toBeInTheDocument();
    expect(within(stopLossRow).getByText('90.00')).toBeInTheDocument();
    expect(
      within(stopLossRow).getByRole('button', { name: 'Cancel stop loss for AAPL at 90.00' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state when there are no active stop losses', async () => {
    mockedFetchActiveStopLosses.mockResolvedValue([]);

    renderPortfolio();

    await waitFor(() => {
      expect(screen.getByText('No active stop losses')).toBeInTheDocument();
    });
  });

  it('shows an error message when the stop losses cannot be loaded', async () => {
    mockedFetchActiveStopLosses.mockRejectedValue(new Error('Network down'));

    renderPortfolio();

    await waitFor(() => {
      expect(screen.getByText('Network down')).toBeInTheDocument();
    });
  });

  it('keeps the stop loss when the cancellation is not confirmed', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderPortfolio();

    const cancelButton = await screen.findByRole('button', {
      name: 'Cancel stop loss for AAPL at 90.00',
    });
    await user.click(cancelButton);

    expect(mockedCancelStopLoss).not.toHaveBeenCalled();
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    confirmSpy.mockRestore();
  });

  it('removes the stop loss from the table after a confirmed cancellation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPortfolio();

    const cancelButton = await screen.findByRole('button', {
      name: 'Cancel stop loss for AAPL at 90.00',
    });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(mockedCancelStopLoss).toHaveBeenCalledWith('sl-1');
    });

    await waitFor(() => {
      expect(screen.getByText('No active stop losses')).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('alerts the user when the cancellation fails', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    mockedCancelStopLoss.mockRejectedValue(new Error('Server error'));

    renderPortfolio();

    const cancelButton = await screen.findByRole('button', {
      name: 'Cancel stop loss for AAPL at 90.00',
    });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to cancel stop loss: Server error');
    });

    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
