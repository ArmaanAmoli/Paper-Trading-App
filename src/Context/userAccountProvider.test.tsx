import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContext } from 'react';
import { UserAccountContext } from './context';
import { UserAccountProvider } from './contextProviders';
import api from '../services/api';
import { createUserData } from '../lib/testHelpers';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

function Probe() {
  const context = useContext(UserAccountContext);
  if (!context) throw new Error('UserAccountContext is missing');

  const account = context.userAccountInformation;

  return (
    <div>
      <span data-testid="username">{account?.username ?? 'none'}</span>
      <span data-testid="balance">{account?.balance ?? 'none'}</span>
      <span data-testid="blocked-margin">{account?.blockedMargin ?? 'none'}</span>
      <button
        type="button"
        onClick={() => context.setUserAccountInformation(createUserData({ username: 'updated' }))}
      >
        update account
      </button>
    </div>
  );
}

beforeEach(() => {
  mockedApi.get.mockReset();
});

describe('UserAccountProvider', () => {
  it('loads the account information from /user-data', async () => {
    mockedApi.get.mockResolvedValue({
      data: createUserData({ username: 'trader', balance: 2500, blockedMargin: 100 }),
    });

    render(
      <UserAccountProvider>
        <Probe />
      </UserAccountProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('trader');
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/user-data');
    expect(screen.getByTestId('balance')).toHaveTextContent('2500');
    expect(screen.getByTestId('blocked-margin')).toHaveTextContent('100');
  });

  it('falls back to an empty account when the request fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('network down'));

    render(
      <UserAccountProvider>
        <Probe />
      </UserAccountProvider>,
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalled();
    });

    expect(screen.getByTestId('username')).toHaveTextContent('');
    expect(screen.getByTestId('balance')).toHaveTextContent('0');
    expect(screen.getByTestId('blocked-margin')).toHaveTextContent('0');
  });

  it('exposes a setter that updates the account information', async () => {
    mockedApi.get.mockResolvedValue({ data: createUserData({ username: 'trader' }) });

    render(
      <UserAccountProvider>
        <Probe />
      </UserAccountProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('trader');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'update account' }).click();
    });

    expect(screen.getByTestId('username')).toHaveTextContent('updated');
  });
});
