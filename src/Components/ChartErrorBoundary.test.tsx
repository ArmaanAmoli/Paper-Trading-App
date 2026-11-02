import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChartErrorBoundary } from './ChartErrorBoundary';

function Boom(): React.ReactNode {
  throw new Error('Chart failed to render');
}

describe('ChartErrorBoundary', () => {
  it('renders the children when nothing throws', () => {
    render(
      <ChartErrorBoundary>
        <p>Chart content</p>
      </ChartErrorBoundary>,
    );

    expect(screen.getByText('Chart content')).toBeInTheDocument();
  });

  it('renders the chart fallback when a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ChartErrorBoundary>
        <Boom />
      </ChartErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong loading this chart')).toBeInTheDocument();
    expect(screen.getByText(/Chart failed to render/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
