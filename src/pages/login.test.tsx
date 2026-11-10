import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import Login from './login';
import { loginWithPkce } from '../services/auth';
import { fetchUserData } from '../services/api';
import type { UserDataResponse } from '@shared/contract/auth';

vi.mock('../services/auth', () => ({
  loginWithPkce: vi.fn(),
}));

vi.mock('../services/api', () => ({
  fetchUserData: vi.fn(),
}));

const mockedLoginWithPkce = vi.mocked(loginWithPkce);
const mockedFetchUserData = vi.mocked(fetchUserData);

function renderLogin(initialEntry = '/') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Login /> },
      { path: '/landing-page', element: <p>Landing page</p> },
    ],
    { initialEntries: [initialEntry] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  mockedLoginWithPkce.mockReset();
  mockedFetchUserData.mockReset();
  mockedFetchUserData.mockRejectedValue(new Error('no session'));
});

describe('Login', () => {
  it('renders the email and password fields', () => {
    renderLogin();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled();
  });

  it('enables the submit button once both fields are filled', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
  });

  it('logs in with PKCE and navigates to the landing page', async () => {
    mockedLoginWithPkce.mockResolvedValue({ message: 'Tokens issued' });
    const user = userEvent.setup();
    const router = renderLogin();

    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(mockedLoginWithPkce).toHaveBeenCalledWith('trader@example.com', 'password123');
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/landing-page');
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('shows the server error message when the credentials are rejected', async () => {
    mockedLoginWithPkce.mockRejectedValue(new Error('Incorrect Password'));
    const user = userEvent.setup();
    const router = renderLogin();

    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    const alerts = await screen.findAllByText('Incorrect Password');
    expect(alerts.length).toBeGreaterThan(0);
    expect(router.state.location.pathname).toBe('/');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('shows a generic error message when login fails unexpectedly', async () => {
    mockedLoginWithPkce.mockRejectedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    const alerts = await screen.findAllByText('Something went wrong please try again.');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('shows a google sign-in error message from the query string', async () => {
    renderLogin('/?error=google_failed');

    const alerts = await screen.findAllByText('Google sign-in failed. Please try again.');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('redirects to the landing page when a cookie session already exists', async () => {
    mockedFetchUserData.mockResolvedValue({} as UserDataResponse);
    const router = renderLogin();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/landing-page');
    });
  });

  it('stays on the login page when there is no session', async () => {
    const router = renderLogin();

    await waitFor(() => {
      expect(mockedFetchUserData).toHaveBeenCalled();
    });

    expect(router.state.location.pathname).toBe('/');
  });
});
