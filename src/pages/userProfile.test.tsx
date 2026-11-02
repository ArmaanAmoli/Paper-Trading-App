import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { UserAccountContext, UserEquityContext } from '../Context/context';
import type { UserAccountContextValue, UserEquityContextValue } from '../Context/context';
import { getTradeHistory } from '../services/tradeHistory';
import type { TradeHistoryResponse } from '@shared/contract/trade';
import { toast } from 'react-toastify';
import UserProfile from './userProfile';

vi.mock('../services/tradeHistory', () => ({
  getTradeHistory: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockedGetTradeHistory = vi.mocked(getTradeHistory);
const mockedToastSuccess = vi.mocked(toast.success);

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
  portfolio: [[], vi.fn()],
  pnl: [{}, vi.fn()],
  totalPnl: [0, vi.fn()],
  totalEquity: [500, vi.fn()],
};

const tradeHistoryFixture: TradeHistoryResponse = [
  {
    _id: 'trade-1',
    userId: 'user-1',
    symbol: 'AAPL',
    shares: 10,
    price: 100,
    type: 'buy',
    timestamp: '2026-01-02T03:04:00.000Z',
    realizedPL: 120.5,
    orderId: 'order-1',
    wasStopLoss: false,
  },
  {
    _id: 'trade-2',
    userId: 'user-1',
    symbol: 'TSLA',
    shares: -2,
    price: 200,
    type: 'sell',
    timestamp: '2026-01-03T03:04:00.000Z',
    realizedPL: -30,
    orderId: 'order-2',
    wasStopLoss: false,
  },
];

function renderProfile() {
  const router = createMemoryRouter(
    [
      { path: '/profile', element: <UserProfile /> },
      { path: '/', element: <p>Login page</p> },
    ],
    { initialEntries: ['/profile'] },
  );

  render(
    <UserAccountContext.Provider value={accountValue}>
      <UserEquityContext.Provider value={equityValue}>
        <RouterProvider router={router} />
      </UserEquityContext.Provider>
    </UserAccountContext.Provider>,
  );

  return router;
}

beforeEach(() => {
  mockedGetTradeHistory.mockReset();
  mockedToastSuccess.mockReset();
  mockedGetTradeHistory.mockResolvedValue(tradeHistoryFixture);
});

describe('UserProfile', () => {
  it('renders the account identity details', async () => {
    renderProfile();

    expect(screen.getByText('trader')).toBeInTheDocument();
    expect(screen.getByText('trader@example.com')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Profile' })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    });
  });

  it('renders the balance, equity and margin cards', async () => {
    renderProfile();

    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('Equity')).toBeInTheDocument();
    // Balance (1000) + total equity (500)
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('Blocked Margin')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByText('Holdings Value')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedGetTradeHistory).toHaveBeenCalled();
    });
  });

  it('renders the trade history rows', async () => {
    renderProfile();

    await waitFor(() => {
      expect(mockedGetTradeHistory).toHaveBeenCalled();
    });

    const rows = screen.getAllByRole('row');
    const buyRow = rows.find((row) => within(row).queryByText('AAPL') !== null);
    expect(buyRow).toBeDefined();

    if (!buyRow) return;
    expect(within(buyRow).getByText('BUY')).toBeInTheDocument();
    expect(within(buyRow).getByText('10')).toBeInTheDocument();
    expect(within(buyRow).getByText('+120.50')).toBeInTheDocument();

    const sellRow = rows.find((row) => within(row).queryByText('TSLA') !== null);
    expect(sellRow).toBeDefined();

    if (!sellRow) return;
    expect(within(sellRow).getByText('SELL')).toBeInTheDocument();
    expect(within(sellRow).getByText('-30.00')).toBeInTheDocument();
  });

  it('shows the empty state when there are no trades', async () => {
    mockedGetTradeHistory.mockResolvedValue([]);

    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('No trades yet')).toBeInTheDocument();
    });
  });

  it('clears the token and navigates to the login page on logout', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'jwt-token');
    const router = renderProfile();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(localStorage.getItem('token')).toBeNull();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });

  it('keeps the delete button disabled until DELETE is typed', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));

    const dialog = screen.getByRole('dialog');
    const deleteButton = within(dialog).getByRole('button', { name: 'Delete account' });
    expect(deleteButton).toBeDisabled();

    await user.type(within(dialog).getByLabelText('Type "DELETE" to confirm:'), 'DELETE');
    expect(deleteButton).toBeEnabled();
  });

  it('does not send a delete request when the confirmation text does not match', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Type "DELETE" to confirm:'), 'delete');

    expect(within(dialog).getByRole('button', { name: 'Delete account' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deletes the account, clears the token and redirects home', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'jwt-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Account deleted' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const router = renderProfile();

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Type "DELETE" to confirm:'), 'DELETE');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/user/me', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer jwt-token',
        },
      });
    });

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
    });
    expect(mockedToastSuccess).toHaveBeenCalledWith('Account deleted');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });

  it('shows the server error when the account cannot be deleted', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Deletion not allowed' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const router = renderProfile();

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Type "DELETE" to confirm:'), 'DELETE');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Deletion not allowed');
    });
    expect(router.state.location.pathname).toBe('/profile');
  });

  it('shows a generic error when the delete request throws', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Type "DELETE" to confirm:'), 'DELETE');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.',
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
