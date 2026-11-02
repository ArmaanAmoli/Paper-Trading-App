import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import Login from './login';
import { createValidToken } from '../test/helpers';

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Login /> },
      { path: '/landing-page', element: <p>Landing page</p> },
    ],
    { initialEntries: ['/'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

function mockFetchOnce(response: { ok: boolean; data: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => response.data,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('Login', () => {
  it('renders the email and password fields', () => {
    mockFetchOnce({ ok: false, data: {} });
    renderLogin();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled();
  });

  it('enables the submit button once both fields are filled', async () => {
    const user = userEvent.setup();
    mockFetchOnce({ ok: false, data: {} });
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
  });

  it('stores the token and navigates to the landing page on success', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchOnce({
      ok: true,
      data: { message: 'Login Success', token: 'jwt-token' },
    });
    const router = renderLogin();

    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/landing-page');
    });

    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'trader@example.com', password: 'password123' }),
      }),
    );
  });

  it('shows the server error message when the credentials are rejected', async () => {
    const user = userEvent.setup();
    mockFetchOnce({ ok: false, data: { message: 'Incorrect Password' } });
    const router = renderLogin();

    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    const alerts = await screen.findAllByText('Incorrect Password');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('shows a generic error message when the request fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    const alerts = await screen.findAllByText('Something went wrong please try again.');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toBeInTheDocument();
  });

  it('stores a token passed through the query string and navigates to the landing page', async () => {
    const token = createValidToken();
    const router = createMemoryRouter(
      [
        { path: '/', element: <Login /> },
        { path: '/landing-page', element: <p>Landing page</p> },
      ],
      { initialEntries: [`/?token=${encodeURIComponent(token)}`] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/landing-page');
    });

    expect(localStorage.getItem('token')).toBe(token);
  });

  it('shows a google sign-in error message from the query string', async () => {
    const router = createMemoryRouter(
      [
        { path: '/', element: <Login /> },
        { path: '/landing-page', element: <p>Landing page</p> },
      ],
      { initialEntries: ['/?error=google_failed'] },
    );

    render(<RouterProvider router={router} />);

    const alerts = await screen.findAllByText('Google sign-in failed. Please try again.');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toBeInTheDocument();
  });

  it('redirects to the landing page when a valid token is already stored', async () => {
    localStorage.setItem('token', createValidToken());
    const router = renderLogin();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/landing-page');
    });
  });
});
