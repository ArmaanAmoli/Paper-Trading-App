import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastProvider } from './Toast';
import { toast } from './toastUtils';

afterEach(() => {
  act(() => {
    toast.remove('all');
  });
});

describe('ToastProvider', () => {
  it('renders the children alongside the notification region', () => {
    render(
      <ToastProvider>
        <p>Page content</p>
      </ToastProvider>,
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('shows a toast with its description', () => {
    render(
      <ToastProvider>
        <p>Page content</p>
      </ToastProvider>,
    );

    act(() => {
      toast.success('Order executed');
    });

    expect(screen.getByText('Order executed')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows a toast title when one is provided', () => {
    render(
      <ToastProvider>
        <p>Page content</p>
      </ToastProvider>,
    );

    act(() => {
      toast.error('Trade failed', { title: 'Error' });
    });

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Trade failed')).toBeInTheDocument();
  });
});
