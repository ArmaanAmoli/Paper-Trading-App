import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTicker } from './useTicker';
import { wsManager } from '../lib/wsManager';

vi.mock('../lib/wsManager', () => ({
  wsManager: {
    subscriber: vi.fn(),
    unsubscriber: vi.fn(),
  },
}));

const mockedWsManager = vi.mocked(wsManager);

function Probe({ ticker }: { ticker: string }) {
  const data = useTicker('quote', ticker);

  return (
    <div>
      <span data-testid="price">{data.currentPrice}</span>
      <span data-testid="change">{data.change}</span>
      <span data-testid="percent">{data.percentChange}</span>
    </div>
  );
}

beforeEach(() => {
  mockedWsManager.subscriber.mockReset();
  mockedWsManager.unsubscriber.mockReset();
});

describe('useTicker', () => {
  it('returns zeroed values before any message arrives', () => {
    render(<Probe ticker="AAPL" />);

    expect(screen.getByTestId('price')).toHaveTextContent('0');
    expect(screen.getByTestId('change')).toHaveTextContent('0');
    expect(screen.getByTestId('percent')).toHaveTextContent('0');
  });

  it('subscribes to the quote stream for the ticker', async () => {
    render(<Probe ticker="AAPL" />);

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalledTimes(1);
    });

    expect(mockedWsManager.subscriber.mock.calls[0][0]).toBe('quote');
    expect(mockedWsManager.subscriber.mock.calls[0][1]).toBe('AAPL');
  });

  it('does not subscribe when the ticker is empty', async () => {
    render(<Probe ticker="" />);

    await waitFor(() => {
      expect(mockedWsManager.subscriber).not.toHaveBeenCalled();
    });
  });

  it('updates the values when a quote message arrives', async () => {
    render(<Probe ticker="AAPL" />);

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalledTimes(1);
    });

    const handler = mockedWsManager.subscriber.mock.calls[0][2];

    await act(async () => {
      handler({
        ticker: 'AAPL',
        currentPrice: 195.5,
        change: 3.25,
        percentChange: 1.7,
      });
    });

    expect(screen.getByTestId('price')).toHaveTextContent('195.5');
    expect(screen.getByTestId('change')).toHaveTextContent('3.25');
    expect(screen.getByTestId('percent')).toHaveTextContent('1.7');
  });

  it('keeps zeroed values for a message that is not a quote', async () => {
    render(<Probe ticker="AAPL" />);

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalledTimes(1);
    });

    const handler = mockedWsManager.subscriber.mock.calls[0][2];

    await act(async () => {
      handler({ ticker: 'AAPL', indicator: 'SMA', interval: '1d' });
    });

    expect(screen.getByTestId('price')).toHaveTextContent('0');
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = render(<Probe ticker="AAPL" />);

    await waitFor(() => {
      expect(mockedWsManager.subscriber).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(mockedWsManager.unsubscriber).toHaveBeenCalledTimes(1);
    expect(mockedWsManager.unsubscriber.mock.calls[0][1]).toBe('AAPL');
  });
});
