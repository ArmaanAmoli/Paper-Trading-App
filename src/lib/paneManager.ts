import { HistogramSeries, LineSeries } from 'lightweight-charts';
import type {
  IChartApi,
  HistogramSeriesPartialOptions,
  LineSeriesPartialOptions,
  ISeriesApi,
  SeriesType,
} from 'lightweight-charts';

export interface SeriesConfig {
  type: 'line' | 'histogram';
  options: LineSeriesPartialOptions | HistogramSeriesPartialOptions;
}

export interface PaneInfo {
  id: string;
  paneIndex: number;
  seriesList: ISeriesApi<SeriesType>[];
}

export class PaneManager {
  private chart: IChartApi;
  private panes: PaneInfo[] = [];
  private nextPaneIndex = 1; // 0 is always the candles, sub-panes start at 1

  constructor(chart: IChartApi) {
    this.chart = chart;
    chart.applyOptions({
      layout: {
        panes: {
          separatorColor: 'rgba(255, 255, 255, 0.2)',
          separatorHoverColor: 'rgba(255, 255, 255, 0.3)',
        },
      },
    });
  }

  private _allocatePane(): number {
    return this.nextPaneIndex++;
  }

  /**
   * Add an indicator - returns array of created series
   */
  add(id: string, seriesConfigs: SeriesConfig[], onMainPane = false): ISeriesApi<SeriesType>[] {
    if (this.panes.find((p) => p.id === id)) {
      console.warn(`Indicator ${id} already exist`);
    }

    const paneIndex = onMainPane ? 0 : this._allocatePane();
    const seriesList = seriesConfigs.map(({ type, options }) => {
      switch (type) {
        case 'line':
          return this.chart.addSeries(LineSeries, options, paneIndex);
        case 'histogram':
          return this.chart.addSeries(HistogramSeries, options, paneIndex);
        default:
          throw new Error(`Unknown series type: ${type as string}`);
      }
    });
    this.panes.push({ id, paneIndex, seriesList });
    return seriesList;
  }

  /** Remove one indicator and reclaim its pane */
  remove(id: string): void {
    const idx = this.panes.findIndex((p) => p.id === id);
    if (idx === -1) return;

    // Remove all the series belonging to this indicator
    this.panes[idx].seriesList.forEach((s) => {
      try {
        this.chart.removeSeries(s);
      } catch (e) {
        console.error(`An error occurred while removing series ${id}:`, e);
      }
    });

    this.panes.splice(idx, 1);
  }

  /** Remove all indicators (but keep candles) */
  removeAll(): void {
    [...this.panes].forEach((p) => this.remove(p.id));
    this.nextPaneIndex = 1;
  }

  /** Get series list of an indicator by id */
  get(id: string): ISeriesApi<SeriesType>[] | null {
    return this.panes.find((p) => p.id === id)?.seriesList ?? null;
  }

  has(id: string): boolean {
    return this.panes.some((p) => p.id === id);
  }
}
