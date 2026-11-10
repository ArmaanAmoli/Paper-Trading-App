import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import Signup from './signup';
import { fetchUserData } from '../services/api';
import type { UserDataResponse } from '@shared/contract/auth';

vi.mock('../services/api', () => ({
  fetchUserData: vi.fn(),
}));

const mockedFetchUserData = vi.mocked(fetchUserData);

function renderSignup(initialEntry = '/signup') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Login page</p> },
      { path: '/landing-page', element: <p>Landing page</p> },
      { path: '/signup', element: <Signup /> },
    ],
    { initialEntries: [initialEntry] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  mockedFetchUserData.mockReset();
  mockedFetchUserData.mockRejectedValue(new Error('no session'));
});

describe('Signup', () => {
  it('renders the registration form fields', () => {
    renderSignup();

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  it('keeps the submit button disabled until every field is filled', async () => {
    const user = userEvent.setup();
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
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.endsWith('/user-data')) {
        return Promise.resolve({ ok: false, status: 401 });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: 'User Registered' }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
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
        credentials: 'include',
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: unknown) => {
        const url = String(input);
        if (url.endsWith('/user-data')) {
          return Promise.resolve({ ok: false, status: 401 });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'User already exists' }),
        });
      }),
    );
    const router = renderSignup();

    await user.type(screen.getByLabelText('Username'), 'trader');
    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('User already exists')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/signup');
  });

  it('shows a generic error message when the registration request fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: unknown) => {
        const url = String(input);
        if (url.endsWith('/user-data')) {
          return Promise.resolve({ ok: false, status: 401 });
        }
        return Promise.reject(new Error('network down'));
      }),
    );
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
    renderSignup();

    await user.type(screen.getByLabelText('Username'), 'trader');
    await user.type(screen.getByLabelText('Email'), 'trader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'different123');

    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled();

    const confirmInput = screen.getByLabelText('Confirm password');
    await user.clear(confirmInput);
    await user.type(confirmInput, 'password123');

    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
  });

  it('redirects to the landing page when a cookie session already exists', async () => {
    mockedFetchUserData.mockResolvedValue({} as UserDataResponse);
    const router = renderSignup();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/landing-page');
    });
  });
});
