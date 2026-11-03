import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IndicatorsList, type IndicatorListItem } from '../Context/context';
import IndicatorsDropdown from './IndicatorsDropdown';

function renderDropdown(indicatorList: IndicatorListItem[] = []) {
  const setIndicatorList = vi.fn();

  render(
    <IndicatorsList.Provider value={{ indicatorList, setIndicatorList }}>
      <IndicatorsDropdown interval="1h" />
    </IndicatorsList.Provider>,
  );

  return { setIndicatorList };
}

describe('IndicatorsDropdown', () => {
  it('renders the collapsed dropdown button', () => {
    renderDropdown();

    const button = screen.getByRole('button', { name: 'Indicators menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu when the button is clicked', async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(screen.getByRole('button', { name: 'Indicators menu' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Indicators menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('lists every supported indicator', async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(screen.getByRole('button', { name: 'Indicators menu' }));

    expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(5);
    expect(screen.getByText('Moving Average')).toBeInTheDocument();
    expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
    expect(screen.getByText('Relative Strength Index')).toBeInTheDocument();
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('Stochastic Oscillator')).toBeInTheDocument();
  });

  it('marks active indicators as checked and shows the active count', async () => {
    const user = userEvent.setup();
    renderDropdown([
      {
        indicator: 'SMA',
        indicatorId: 'SMA',
        title: 'Moving Average',
        fields: [],
      },
    ]);

    expect(screen.getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Indicators menu' }));

    expect(screen.getByRole('menuitemcheckbox', { name: /Moving Average/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('dispatches the open-indicator-popup event with the indicator and interval', async () => {
    const user = userEvent.setup();
    const listener = vi.fn();
    window.addEventListener('open-indicator-popup', listener);

    try {
      renderDropdown();
      await user.click(screen.getByRole('button', { name: 'Indicators menu' }));
      await user.click(screen.getByRole('menuitemcheckbox', { name: /Relative Strength Index/ }));

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as CustomEvent<{
        indicator: string;
        interval: string;
      }>;
      expect(event.detail).toEqual({ indicator: 'RSI', interval: '1h' });
    } finally {
      window.removeEventListener('open-indicator-popup', listener);
    }
  });

  it('closes the menu when the escape key is pressed', async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(screen.getByRole('button', { name: 'Indicators menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
