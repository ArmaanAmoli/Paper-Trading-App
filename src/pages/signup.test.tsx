import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import Signup from './signup';
import { createValidToken } from '../test/helpers';

function renderSignup(initialEntry = '/signup') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Login page</p> },
      { path: '/signup', element: <Signup /> },
    ],
    { initialEntries: [initialEntry] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

function mockFetchOnce(response: { data: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => response.data,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('Signup', () => {
  it('renders the registration form fields', () => {
    mockFetchOnce({ data: { message: 'User Registered' } });
    renderSignup();

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  it('keeps the submit button disabled until every field is filled', async () => {
    const user = userEvent.setup();
    mockFetchOnce({ data: { message: 'User Registered' } });
    renderSignup();

    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled();

    await user.type(screen.getByLabelText('Username'), 'trader');
    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');

    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
  });

  it('registers the user and navigates to the login page', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchOnce({ data: { message: 'User Registered' } });
    const router = renderSignup();

    await user.type(screen.getByLabelText('Username'), 'trader');
    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/sign-up',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'trader@example.com',
          username: 'trader',
          password: 'password123',
        }),
      }),
    );
  });

  it('shows the server message when the registration is rejected', async () => {
    const user = userEvent.setup();
    mockFetchOnce({ data: { message: 'User already exists' } });
    const router = renderSignup();

    await user.type(screen.getByLabelText('Username'), 'trader');
    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('User already exists')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/signup');
  });

  it('shows a generic error message when the request fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    renderSignup();

    await user.type(screen.getByLabelText('Username'), 'trader');
    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('Something went wrong please try again.')).toBeInTheDocument();
  });

  it('keeps the submit button disabled when the password confirmation does not match', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchOnce({ data: { message: 'User Registered' } });
    renderSignup();

    await user.type(screen.getByLabelText('Username'), 'trader');
    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'different123');

    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();

    const confirmInput = screen.getByLabelText('Confirm password');
    await user.clear(confirmInput);
    await user.type(confirmInput, 'password123');

    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
  });

  it('stores a token passed through the query string and navigates to the login page', async () => {
    const token = createValidToken();
    const router = renderSignup(`/signup?token=${encodeURIComponent(token)}`);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });

    expect(localStorage.getItem('token')).toBe(token);
  });

  it('shows a google sign-in error message from the query string', async () => {
    renderSignup('/signup?error=google_failed');

    expect(await screen.findByText('Google sign-in failed. Please try again.')).toBeInTheDocument();
  });

  it('redirects to the login page when a valid token is already stored', async () => {
    localStorage.setItem('token', createValidToken());
    const router = renderSignup();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });
});
