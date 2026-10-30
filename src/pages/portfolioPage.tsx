import { useContext, useState, useEffect, useCallback } from 'react';
import './styles/portfolioPage.css';
import { UserAccountContext, UserEquityContext } from '../Context/context';
import { fetchActiveStopLosses, cancelStopLoss } from '../services/api';
import {
  formatNumber,
  formatSignedNumber,
  formatPercent,
  getValueColorClass,
  getSideBadgeClass,
  getSideLabel,
} from '../lib/formatters';
import type { StopLossData } from '../Components/Charts/candlestick';
import type { PortfolioResponse } from '@shared/contract/trade';

export default function PortfolioPage() {
  const userAccountContext = useContext(UserAccountContext);
  const userEquityContext = useContext(UserEquityContext);

  // UserAccountContext provides an object, not a tuple
  const userAccountInformation = userAccountContext?.userAccountInformation ?? {
    username: '',
    email: '',
    balance: 0,
    blockedMargin: 0,
  };

  // UserEquityContext provides an object with tuple properties
  const portfolio = userEquityContext?.portfolio?.[0] ?? [];
  const pnl = userEquityContext?.pnl?.[0] ?? {};
  const totalPnlValue = userEquityContext?.totalPnl?.[0] ?? 0;
  const Equity = userEquityContext?.totalEquity?.[0] ?? 0;

  const assetList = portfolio;
  const prices = pnl as Record<string, { Pnl: string; pChange: string }>;

  const balance = userAccountInformation?.balance ?? 0;
  const equity = Equity ?? 0;
  const totalEquityValue = balance + equity;

  // Stop losses state
  const [stopLosses, setStopLosses] = useState<StopLossData[]>([]);
  const [stopLossesLoading, setStopLossesLoading] = useState(true);
  const [stopLossesError, setStopLossesError] = useState<string | null>(null);

  // Fetch active stop losses
  useEffect(() => {
    let mounted = true;
    async function loadStopLosses() {
      setStopLossesLoading(true);
      setStopLossesError(null);
      try {
        const data = await fetchActiveStopLosses();
        if (mounted) setStopLosses(data || []);
      } catch (err) {
        if (mounted) setStopLossesError(err instanceof Error ? err.message : 'Failed to load stop losses');
      } finally {
        if (mounted) setStopLossesLoading(false);
      }
    }
    void loadStopLosses();
    return () => {
      mounted = false;
    };
  }, []);

  // Cancel stop loss handler
  const handleCancelStopLoss = useCallback(async (stopLossId: string, symbol: string, price: string) => {
    const confirmed = window.confirm(`Cancel this stop loss for ${symbol} at ${price}?`);
    if (!confirmed) return;
    try {
      await cancelStopLoss(stopLossId);
      setStopLosses((prev) => prev.filter((sl) => sl._id !== stopLossId));
    } catch (err) {
      alert('Failed to cancel stop loss: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, []);

  return (
    <div className="Portfolio-page">
      <div className="portfolio-container">
        {/* Page Header */}
        <header className="portfolio-header">
          <h1 className="portfolio-title">Portfolio</h1>
          <p className="portfolio-subtitle">Your open positions and account summary</p>
        </header>

        {/* Summary Cards Grid */}
        <div className="summary-grid">
          <article className="summary-card">
            <p className="summary-label">Unrealized P&L</p>
            <p className={`summary-value ${getValueColorClass(totalPnlValue)}`}>
              {formatSignedNumber(totalPnlValue)}
            </p>
          </article>

          <article className="summary-card">
            <p className="summary-label">Account Balance</p>
            <p className="summary-value">{formatNumber(balance)}</p>
          </article>

          <article className="summary-card">
            <p className="summary-label">Equity</p>
            <p className="summary-value">{formatNumber(totalEquityValue)}</p>
          </article>
        </div>

        {/* Positions Table Card */}
        <section className="positions-card">
          <div className="positions-card-header">
            <h2 className="positions-card-title">Open positions</h2>
            <span className="positions-count-badge">{assetList?.length ?? 0}</span>
          </div>

          <div className="positions-table-wrapper">
            {assetList && assetList.length > 0 ? (
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>S.NO</th>
                    <th>SYMBOL</th>
                    <th>SIDE</th>
                    <th>QTY</th>
                    <th>DAILY PNL</th>
                    <th>%RETURN</th>
                  </tr>
                </thead>
                <tbody>
                  {assetList.map((item: PortfolioResponse['positions'][number], index: number) => {
                    const symbol = item.symbol;
                    const pnlValue = prices?.[symbol]?.Pnl;
                    const pChange = prices?.[symbol]?.pChange;
                    const isLoading = pnlValue === undefined || pChange === undefined;
                    const pnlColor = getValueColorClass(pnlValue);
                    const pChangeColor = getValueColorClass(pChange);
                    const sideBadgeClass = getSideBadgeClass(item.shares);
                    const sideLabel = getSideLabel(item.shares);

                    return (
                      <tr key={symbol} className="row">
                        <td>{index + 1}</td>
                        <td>{symbol}</td>
                        <td>
                          <span className={`side-badge ${sideBadgeClass}`}>{sideLabel}</span>
                        </td>
                        <td className="tabular-nums">{Math.abs(item.shares)}</td>
                        <td className={`tabular-nums ${pnlColor}`}>
                          {isLoading ? (
                            <span className="loading-dot">...</span>
                          ) : (
                            formatSignedNumber(pnlValue)
                          )}
                        </td>
                        <td className={`tabular-nums ${pChangeColor}`}>
                          {isLoading ? (
                            <span className="loading-dot">...</span>
                          ) : (
                            formatPercent(pChange)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="positions-empty">
                <p className="positions-empty-title">No open positions yet</p>
                <p className="positions-empty-subtitle">
                  Place a trade from the Chart page to see it here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Active Stop Losses Card */}
        <section className="stop-losses-card">
          <div className="stop-losses-card-header">
            <h2 className="stop-losses-card-title">Active stop losses</h2>
            <span className="stop-losses-count-badge">{stopLosses.length}</span>
          </div>

          <div className="stop-losses-table-wrapper">
            {stopLossesLoading ? (
              <div className="stop-losses-loading">Loading...</div>
            ) : stopLossesError ? (
              <div className="stop-losses-error">{stopLossesError}</div>
            ) : stopLosses.length > 0 ? (
              <table className="stop-losses-table">
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '72px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>SYMBOL</th>
                    <th>SIDE</th>
                    <th>QTY</th>
                    <th>TRIGGER PRICE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {stopLosses.map((sl) => (
                    <tr key={sl._id} className="row">
                      <td title={sl.symbol}>{sl.symbol}</td>
                      <td>
                        <span
                          className={`side-badge ${sl.type === 'buy' ? 'side-long' : 'side-short'}`}
                        >
                          {sl.type === 'buy' ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="tabular-nums">{formatNumber(sl.qty)}</td>
                      <td className="tabular-nums trigger-price">{formatNumber(sl.price)}</td>
                      <td className="actions-cell">
                        <button
                          className="cancel-stoploss-btn"
                          onClick={() =>
                            handleCancelStopLoss(sl._id, sl.symbol, formatNumber(sl.price))
                          }
                          aria-label={`Cancel stop loss for ${sl.symbol} at ${formatNumber(sl.price)}`}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="stop-losses-empty">
                <p className="stop-losses-empty-title">No active stop losses</p>
                <p className="stop-losses-empty-subtitle">
                  Add one from the Order panel on the Chart page.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
