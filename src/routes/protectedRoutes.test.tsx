import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ProtectedRoutes from './protectedRoutes';
import { createExpiredToken, createValidToken } from '../test/helpers';

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

describe('ProtectedRoutes', () => {
  it('renders the protected outlet when a valid token is stored', async () => {
    localStorage.setItem('token', createValidToken());

    const router = renderProtectedRoutes();

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/protected/secret');
  });

  it('redirects to the root when no token is stored', async () => {
    const router = renderProtectedRoutes();

    expect(await screen.findByText('Public landing page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to the root when the stored token is expired', async () => {
    localStorage.setItem('token', createExpiredToken());

    const router = renderProtectedRoutes();

    expect(await screen.findByText('Public landing page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('redirects to the root when the stored token is malformed', async () => {
    localStorage.setItem('token', 'not-a-jwt');

    const router = renderProtectedRoutes();

    expect(await screen.findByText('Public landing page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
