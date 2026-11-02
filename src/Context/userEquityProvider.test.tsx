import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContext } from 'react';
import { UserEquityContext } from './context';
import { UserEquityProvider } from './contextProviders';
import api from '../services/api';
import { fetchQuote } from '../services/dataRequesterForCharts';
import { createPortfolioPosition, createQuote } from '../test/helpers';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../services/dataRequesterForCharts', () => ({
  fetchQuote: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const mockedFetchQuote = vi.mocked(fetchQuote);

function Probe() {
  const context = useContext(UserEquityContext);
  if (!context) throw new Error('UserEquityContext is missing');

  const [positions] = context.portfolio;
  const [pnl] = context.pnl;
  const [totalPnl] = context.totalPnl;
  const [totalEquity] = context.totalEquity;

  return (
    <div>
      <span data-testid="symbols">{positions.map((position) => position.symbol).join(',')}</span>
      <span data-testid="pnl-aapl">{pnl['AAPL']?.Pnl ?? 'none'}</span>
      <span data-testid="pchange-aapl">{pnl['AAPL']?.pChange ?? 'none'}</span>
      <span data-testid="total-pnl">{totalPnl}</span>
      <span data-testid="total-equity">{totalEquity}</span>
    </div>
  );
}

beforeEach(() => {
  mockedApi.get.mockReset();
  mockedFetchQuote.mockReset();
});

describe('UserEquityProvider', () => {
  it('loads the portfolio positions from /portfolio', async () => {
    mockedApi.get.mockResolvedValue({
      data: { count: 1, positions: [createPortfolioPosition({ symbol: 'AAPL' })] },
    });
    mockedFetchQuote.mockResolvedValue(createQuote({ ticker: 'AAPL', currentPrice: 150 }));

    render(
      <UserEquityProvider>
        <Probe />
      </UserEquityProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('symbols')).toHaveTextContent('AAPL');
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/portfolio');
    expect(mockedFetchQuote).toHaveBeenCalledWith('AAPL');
  });

  it('calculates the per-position pnl and the totals from the current quotes', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        count: 1,
        positions: [createPortfolioPosition({ symbol: 'AAPL', shares: 10, avgPrice: 100 })],
      },
    });
    mockedFetchQuote.mockResolvedValue(createQuote({ ticker: 'AAPL', currentPrice: 150 }));

    render(
      <UserEquityProvider>
        <Probe />
      </UserEquityProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pnl-aapl')).toHaveTextContent('500.00');
    });

    expect(screen.getByTestId('pchange-aapl')).toHaveTextContent('50.00');
    expect(screen.getByTestId('total-pnl')).toHaveTextContent('500');
    expect(screen.getByTestId('total-equity')).toHaveTextContent('1500');
  });

  it('reports a positive percentage change for short positions', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        count: 1,
        positions: [
          createPortfolioPosition({
            symbol: 'AAPL',
            shares: -10,
            avgPrice: 100,
            positionType: 'short',
          }),
        ],
      },
    });
    mockedFetchQuote.mockResolvedValue(createQuote({ ticker: 'AAPL', currentPrice: 90 }));

    render(
      <UserEquityProvider>
        <Probe />
      </UserEquityProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pnl-aapl')).toHaveTextContent('100.00');
    });

    expect(screen.getByTestId('pchange-aapl')).toHaveTextContent('10.00');
  });

  it('leaves the pnl empty when the portfolio has no positions', async () => {
    mockedApi.get.mockResolvedValue({ data: { count: 0, positions: [] } });

    render(
      <UserEquityProvider>
        <Probe />
      </UserEquityProvider>,
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalled();
    });

    expect(screen.getByTestId('symbols')).toHaveTextContent('');
    expect(screen.getByTestId('pnl-aapl')).toHaveTextContent('none');
    expect(screen.getByTestId('total-pnl')).toHaveTextContent('0');
    expect(mockedFetchQuote).not.toHaveBeenCalled();
  });

  it('keeps the portfolio empty when the request fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('network down'));

    render(
      <UserEquityProvider>
        <Probe />
      </UserEquityProvider>,
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalled();
    });

    expect(screen.getByTestId('symbols')).toHaveTextContent('');
    expect(screen.getByTestId('total-pnl')).toHaveTextContent('0');
  });
});
