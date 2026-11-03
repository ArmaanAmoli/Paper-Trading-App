import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): React.ReactNode {
  throw new Error('Component exploded');
}

describe('ErrorBoundary', () => {
  it('renders the children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>Healthy content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Healthy content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders the default fallback when a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByText(/Component exploded/)).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('renders a custom fallback when one is provided', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary fallback={(error) => <p>Custom fallback: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback: Component exploded')).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
