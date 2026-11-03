import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { UserAccountContext } from '../Context/context';
import Navbar from './Navbar';

function renderNavbar(initialEntry = '/landing-page') {
  const router = createMemoryRouter(
    [
      {
        path: '/landing-page',
        element: <Navbar />,
      },
      {
        path: '/userPortfolio',
        element: <p>Portfolio page</p>,
      },
      {
        path: '/userprofile',
        element: <p>Profile page</p>,
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('Navbar', () => {
  it('renders the navigation links', () => {
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/landing-page');
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute(
      'href',
      '/userPortfolio',
    );
  });

  it('marks the current page as active', () => {
    renderNavbar('/landing-page');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Portfolio' })).not.toHaveAttribute('aria-current');
  });

  it('navigates to the profile page when the profile button is clicked', async () => {
    const user = userEvent.setup();
    const router = renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Profile' }));

    expect(router.state.location.pathname).toBe('/userprofile');
  });

  it('navigates to the portfolio page when the portfolio link is clicked', async () => {
    const user = userEvent.setup();
    const router = renderNavbar();

    await user.click(screen.getByRole('link', { name: 'Portfolio' }));

    expect(router.state.location.pathname).toBe('/userPortfolio');
  });

  it('renders without a user account context', () => {
    expect(() => renderNavbar()).not.toThrow();
  });

  it('renders the avatar for the signed in user', () => {
    const router = createMemoryRouter([{ path: '/landing-page', element: <Navbar /> }], {
      initialEntries: ['/landing-page'],
    });

    render(
      <UserAccountContext.Provider
        value={{
          userAccountInformation: {
            _id: 'user-1',
            username: 'trader',
            email: 'trader@example.com',
            balance: 100,
            blockedMargin: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            lastLogin: null,
            notificationSubscription: null,
          },
          setUserAccountInformation: vi.fn(),
        }}
      >
        <RouterProvider router={router} />
      </UserAccountContext.Provider>,
    );

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
  });
});
