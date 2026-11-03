import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type React from 'react';
import { IndicatorsList } from '../../Context/context';
import type { IndicatorListItem } from '../../Context/context';
import { fetchIndicatorData } from '../../services/dataRequesterForCharts';
import { indicatorConfigs } from './indicatorConfigs';
import IndicatorModal from './IndicatorModal';

vi.mock('../../services/dataRequesterForCharts', () => ({
  fetchIndicatorData: vi.fn(),
}));

const mockedFetchIndicatorData = vi.mocked(fetchIndicatorData);

function renderModal(options?: {
  onClose?: () => void;
  setIndicatorList?: (updater: (prev: IndicatorListItem[]) => IndicatorListItem[]) => void;
}) {
  const onClose = options?.onClose ?? vi.fn();
  const setIndicatorList =
    options?.setIndicatorList ??
    vi.fn((updater: (prev: IndicatorListItem[]) => IndicatorListItem[]) => updater([]));

  render(
    <MemoryRouter initialEntries={['/chart/AAPL']}>
      <IndicatorsList.Provider
        value={{
          indicatorList: [],
          setIndicatorList: setIndicatorList as unknown as React.Dispatch<
            React.SetStateAction<IndicatorListItem[]>
          >,
        }}
      >
        <Routes>
          <Route
            path="/chart/:ticker"
            element={
              <IndicatorModal
                isOpen={true}
                onClose={onClose}
                indicatorConfig={indicatorConfigs.SMA}
                interval="1h"
              />
            }
          />
        </Routes>
      </IndicatorsList.Provider>
    </MemoryRouter>,
  );

  return { onClose, setIndicatorList };
}

// The modal overlay is marked aria-hidden, so its contents are only reachable
// through queries that explicitly include hidden elements.
const dialog = () => screen.getByRole('dialog', { hidden: true });
const addButton = () => screen.getByRole('button', { name: 'Add', hidden: true });
const cancelButton = () => screen.getByRole('button', { name: 'Cancel', hidden: true });

beforeEach(() => {
  mockedFetchIndicatorData.mockReset();
  mockedFetchIndicatorData.mockResolvedValue({ title: 'SMA', data: [1, 2, 3] });
});

describe('IndicatorModal', () => {
  it('renders the configured fields for the indicator', async () => {
    renderModal();

    expect(dialog()).toBeInTheDocument();
    expect(screen.getByText('Moving Average')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText('Timeperiod')).toHaveValue(14);
    });
    expect(screen.getByLabelText('Type')).toHaveValue('SMA');
    expect(addButton()).toBeInTheDocument();
  });

  it('requests the indicator data with the configured properties', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Timeperiod')).toHaveValue(14);
    });

    await user.click(addButton());

    await waitFor(() => {
      expect(mockedFetchIndicatorData).toHaveBeenCalledTimes(1);
    });

    const properties = mockedFetchIndicatorData.mock.calls[0][0];
    expect(properties.ticker).toBe('AAPL');
    expect(properties.interval).toBe('1h');
    expect(properties.period).toBe('max');
    expect(properties.indicator).toBe('SMA');
    expect(properties.timeperiod).toBe(14);
    expect(properties.lineColor).toBe('#2196F3');
  });

  it('adds the indicator to the list and closes the modal', async () => {
    const user = userEvent.setup();
    const { onClose, setIndicatorList } = renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Timeperiod')).toHaveValue(14);
    });

    await user.click(addButton());

    await waitFor(() => {
      expect(setIndicatorList).toHaveBeenCalledTimes(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('rejects a value below the configured minimum', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Timeperiod')).toHaveValue(14);
    });

    const timeperiod = screen.getByLabelText('Timeperiod');
    await user.clear(timeperiod);
    await user.type(timeperiod, '0');
    await user.click(addButton());

    await waitFor(() => {
      expect(screen.getByText('Must be at least 1')).toBeInTheDocument();
    });
    expect(mockedFetchIndicatorData).not.toHaveBeenCalled();
  });

  it('rejects a value above the configured maximum', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Timeperiod')).toHaveValue(14);
    });

    const timeperiod = screen.getByLabelText('Timeperiod');
    await user.clear(timeperiod);
    await user.type(timeperiod, '500');
    await user.click(addButton());

    await waitFor(() => {
      expect(screen.getByText('Must be at most 200')).toBeInTheDocument();
    });
    expect(mockedFetchIndicatorData).not.toHaveBeenCalled();
  });

  it('shows a validation error for a cleared required field', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Timeperiod')).toHaveValue(14);
    });

    await user.clear(screen.getByLabelText('Timeperiod'));
    await user.click(addButton());

    await waitFor(() => {
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
    expect(mockedFetchIndicatorData).not.toHaveBeenCalled();
  });

  it('closes when the escape key is pressed', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the cancel button is pressed', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(cancelButton());

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
