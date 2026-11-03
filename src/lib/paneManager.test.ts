import { describe, expect, it, vi } from 'vitest';
import { PaneManager, type SeriesConfig } from './paneManager';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

function createChart() {
  const addSeries = vi.fn(
    (_definition: unknown, _options: unknown, _paneIndex?: number) =>
      ({ id: 'series' }) as unknown as ISeriesApi<'Line'>,
  );
  const removeSeries = vi.fn();
  const applyOptions = vi.fn();

  const chart = { addSeries, removeSeries, applyOptions } as unknown as IChartApi;

  return { chart, addSeries, removeSeries, applyOptions };
}

const lineConfig: SeriesConfig = {
  type: 'line',
  options: { color: 'blue' },
};

describe('PaneManager', () => {
  it('applies the pane separator layout options to the chart', () => {
    const { chart, applyOptions } = createChart();

    new PaneManager(chart);

    expect(applyOptions).toHaveBeenCalledWith({
      layout: {
        panes: {
          separatorColor: 'rgba(255, 255, 255, 0.2)',
          separatorHoverColor: 'rgba(255, 255, 255, 0.3)',
        },
      },
    });
  });

  it('adds a line series in a newly allocated sub-pane', () => {
    const { chart, addSeries } = createChart();
    const manager = new PaneManager(chart);

    const series = manager.add('sma', [lineConfig]);

    expect(series).toHaveLength(1);
    expect(addSeries).toHaveBeenCalledWith(expect.anything(), { color: 'blue' }, 1);
    expect(manager.has('sma')).toBe(true);
    expect(manager.get('sma')).toBe(series);
  });

  it('allocates a distinct pane index for each indicator', () => {
    const { chart, addSeries } = createChart();
    const manager = new PaneManager(chart);

    manager.add('sma', [lineConfig]);
    manager.add('ema', [lineConfig]);

    expect(addSeries.mock.calls[0][2]).toBe(1);
    expect(addSeries.mock.calls[1][2]).toBe(2);
  });

  it('adds the series to the main pane when requested', () => {
    const { chart, addSeries } = createChart();
    const manager = new PaneManager(chart);

    manager.add('sma', [lineConfig], true);

    expect(addSeries.mock.calls[0][2]).toBe(0);
  });

  it('returns null for an unknown indicator', () => {
    const { chart } = createChart();
    const manager = new PaneManager(chart);

    expect(manager.get('missing')).toBeNull();
    expect(manager.has('missing')).toBe(false);
  });

  it('removes the series of an indicator and frees the pane', () => {
    const { chart, removeSeries } = createChart();
    const manager = new PaneManager(chart);

    const series = manager.add('sma', [lineConfig]);
    manager.remove('sma');

    expect(removeSeries).toHaveBeenCalledWith(series[0]);
    expect(manager.has('sma')).toBe(false);
  });

  it('does nothing when removing an unknown indicator', () => {
    const { chart, removeSeries } = createChart();
    const manager = new PaneManager(chart);

    manager.remove('missing');

    expect(removeSeries).not.toHaveBeenCalled();
  });

  it('removes every indicator and resets the pane allocation', () => {
    const { chart, addSeries, removeSeries } = createChart();
    const manager = new PaneManager(chart);

    manager.add('sma', [lineConfig]);
    manager.add('ema', [lineConfig]);
    manager.removeAll();

    expect(removeSeries).toHaveBeenCalledTimes(2);
    expect(manager.has('sma')).toBe(false);
    expect(manager.has('ema')).toBe(false);

    manager.add('rsi', [lineConfig]);
    expect(addSeries.mock.calls[2][2]).toBe(1);
  });

  it('throws for an unknown series type', () => {
    const { chart } = createChart();
    const manager = new PaneManager(chart);

    const invalidConfig = { type: 'area', options: {} } as unknown as SeriesConfig;

    expect(() => manager.add('bad', [invalidConfig])).toThrow('Unknown series type: area');
  });
});
