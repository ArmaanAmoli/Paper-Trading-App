import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ProtectedRoutes from './protectedRoutes';
import { fetchUserData } from '../services/api';

vi.mock('../services/api', () => ({
  fetchUserData: vi.fn(),
}));

const mockedFetchUserData = vi.mocked(fetchUserData);

function renderProtectedRoutes() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <p>Public landing page</p>,
      },
      {
        path: '/protected',
        element: <ProtectedRoutes />,
        children: [
          {
            path: '/protected/secret',
            element: <p>Protected content</p>,
          },
        ],
      },
    ],
    { initialEntries: ['/protected/secret'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  mockedFetchUserData.mockReset();
});

describe('ProtectedRoutes', () => {
  it('renders the protected outlet when the cookie session is valid', async () => {
    mockedFetchUserData.mockResolvedValue({
      _id: 'user-1',
      username: 'trader',
      email: 'trader@example.com',
      balance: 1000,
      blockedMargin: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      lastLogin: null,
      notificationSubscription: null,
    });

    const router = renderProtectedRoutes();

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/protected/secret');
    expect(mockedFetchUserData).toHaveBeenCalledTimes(1);
  });

  it('redirects to the root when there is no valid session', async () => {
    mockedFetchUserData.mockRejectedValue(new Error('Unauthorized'));

    const router = renderProtectedRoutes();

    expect(await screen.findByText('Public landing page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});
