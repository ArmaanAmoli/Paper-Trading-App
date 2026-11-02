import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from './landingPage';

vi.mock('./market', () => ({
  default: () => <div data-testid="market-panel" />,
}));

vi.mock('../Components/Watchlist', () => ({
  default: () => <div data-testid="watchlist-panel" />,
}));

describe('LandingPage', () => {
  it('renders the market table and the watchlist side by side', () => {
    render(<LandingPage />);

    expect(screen.getByTestId('market-panel')).toBeInTheDocument();
    expect(screen.getByTestId('watchlist-panel')).toBeInTheDocument();
  });
});
