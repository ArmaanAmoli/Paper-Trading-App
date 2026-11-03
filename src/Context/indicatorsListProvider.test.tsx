import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useContext } from 'react';
import { IndicatorsList, type IndicatorListItem } from './context';
import { IndicatorsListProvider } from './contextProviders';

function Probe() {
  const context = useContext(IndicatorsList);
  if (!context) throw new Error('IndicatorsList context is missing');

  return (
    <div>
      <span data-testid="count">{context.indicatorList.length}</span>
      <span data-testid="titles">
        {context.indicatorList.map((item: IndicatorListItem) => item.title).join(',')}
      </span>
      <button
        type="button"
        onClick={() =>
          context.setIndicatorList((previous) => [
            ...previous,
            {
              indicator: 'SMA',
              indicatorId: 'sma-1',
              title: 'Simple Moving Average',
              fields: [],
            },
          ])
        }
      >
        add indicator
      </button>
    </div>
  );
}

describe('IndicatorsListProvider', () => {
  it('starts with an empty indicator list', () => {
    render(
      <IndicatorsListProvider>
        <Probe />
      </IndicatorsListProvider>,
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('exposes a setter that appends indicators to the list', async () => {
    render(
      <IndicatorsListProvider>
        <Probe />
      </IndicatorsListProvider>,
    );

    const button = screen.getByRole('button', { name: 'add indicator' });
    await act(async () => {
      button.click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('titles')).toHaveTextContent('Simple Moving Average');
  });
});
