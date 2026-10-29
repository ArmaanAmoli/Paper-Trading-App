import { useEffect, useState, useContext, useCallback } from 'react';
import { UserEquityContext, UserAccountContext } from '../Context/context';
import { fetchActiveStopLosses, cancelStopLoss } from '../services/api';
import { formatNumber } from '../lib/formatters';
import Avatar from '../Components/Avatar';
import './styles/portfolioPage.css';
import type { StopLossData } from '../Components/Charts/candlestick';
export default function PortfolioPage() {
  const userAccount = useContext(UserAccountContext);
  const userEquity = useContext(UserEquityContext);
  const [stopLosses, setStopLosses] = useState<StopLossData[]>([]);

  const userData = userAccount?.userAccountInformation;
  const positions = userEquity?.portfolio?.[0] ?? [];
  const Equity = userEquity?.totalEquity?.[0] ?? 0;

  useEffect(() => {
    async function fetchStopLosses() {
      try {
        const data = await fetchActiveStopLosses();
        setStopLosses(data || []);
      } catch (err) {
        console.warn('Failed to fetch stop losses:', err);
      }
    }
    void fetchStopLosses();
    const intervalId = setInterval(fetchStopLosses, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleCancelStopLoss = useCallback(async (id: string) => {
    if (!window.confirm('Cancel this stop loss order?')) return;
    try {
      await cancelStopLoss(id);
      setStopLosses((prev: StopLossData[]) => prev.filter((sl: StopLossData) => sl._id !== id));
    } catch (err) {
      console.error('Failed to cancel stop loss:', err);
      alert('Failed to cancel stop loss');
    }
  }, []);

  const balance = userData?.balance ?? 0;
  const blockedMargin = userData?.blockedMargin ?? 0;
  const equity = Equity ?? 0;
  const holdingsValue = equity;
  const totalEquityValue = balance + equity;

  return (
    <div className="portfolio-page">
      <div className="portfolio-container">
        {/* Page Header */}
        <header className="portfolio-header">
          <h1 className="portfolio-title">Portfolio</h1>
          <p className="portfolio-subtitle">Your holdings, stop losses, and account summary</p>
        </header>

        {/* Main Layout Grid */}
        <div className="portfolio-grid">
          {/* Left Column: Summary Card */}
          <aside className="portfolio-card-wrapper">
            <div className="portfolio-card">
              {/* Avatar & Name */}
              <div className="portfolio-top">
                <Avatar name={userData?.username} size={64} />
                <div className="portfolio-identity">
                  <h2 className="portfolio-name">{userData?.username ?? '--'}</h2>
                  <p className="portfolio-email">{userData?.email ?? '--'}</p>
                </div>
              </div>

              <hr className="portfolio-divider" />

              {/* Stats */}
              <div className="stat-grid">
                <article className="stat-card">
                  <p className="stat-label">Balance</p>
                  <p className="stat-value">${formatNumber(balance)}</p>
                </article>
                <article className="stat-card">
                  <p className="stat-label">Equity</p>
                  <p className="stat-value">${formatNumber(totalEquityValue)}</p>
                </article>
                <article className="stat-card">
                  <p className="stat-label">Blocked Margin</p>
                  <p className="stat-value">${formatNumber(blockedMargin)}</p>
                </article>
                <article className="stat-card">
                  <p className="stat-label">Holdings Value</p>
                  <p className="stat-value">${formatNumber(holdingsValue)}</p>
                </article>
              </div>

              <hr className="portfolio-divider" />

              {/* Actions */}
              <div className="portfolio-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={true}
                >
                  Update Profile
                </button>
              </div>
            </div>
          </aside>

          {/* Right Column */}
          <main className="portfolio-main">
            {/* Positions Table */}
            <section className="history-card">
              <header className="history-header">
                <h2 className="history-title">Positions</h2>
                <span className="history-count">
                  {positions && positions.length > 0 ? positions.length : 0}
                </span>
              </header>
              <div className="history-table-wrapper">
                {positions && positions.length > 0 ? (
                  <table className="history-table" role="grid">
                    <colgroup>
                      <col style={{ width: '72px' }} />
                      <col style={{ minWidth: '120px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '130px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="align-left">S.NO</th>
                        <th className="align-left">SYMBOL</th>
                        <th className="align-right">SHARES</th>
                        <th className="align-right">AVG PRICE</th>
                        <th className="align-right">CURRENT</th>
                        <th className="align-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((item: { _id?: string; symbol: string; shares: number; avgPrice: number }, index: number) => (
                        <tr key={item._id || item.symbol + index}>
                          <td className="align-left">{index + 1}</td>
                          <td className="align-left">{item.symbol}</td>
                          <td className="align-right tabular-nums">{item.shares}</td>
                          <td className="align-right tabular-nums">{formatNumber(item.avgPrice)}</td>
                          <td className="align-right tabular-nums">--</td>
                          <td className="align-right tabular-nums">--</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="history-empty">
                    <p className="history-empty-title">No positions yet</p>
                    <p className="history-empty-subtitle">Your open positions will appear here.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Stop Losses Table */}
            <section className="history-card">
              <header className="history-header">
                <h2 className="history-title">Stop Losses</h2>
                <span className="history-count">
                  {stopLosses && stopLosses.length > 0 ? stopLosses.length : 0}
                </span>
              </header>
              <div className="history-table-wrapper">
                {stopLosses && stopLosses.length > 0 ? (
                  <table className="history-table" role="grid">
                    <colgroup>
                      <col style={{ width: '72px' }} />
                      <col style={{ minWidth: '120px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '190px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="align-left">S.NO</th>
                        <th className="align-left">SYMBOL</th>
                        <th className="align-left">TYPE</th>
                        <th className="align-right">QTY</th>
                        <th className="align-right">TRIGGER PRICE</th>
                        <th className="align-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stopLosses.map((item: StopLossData, index: number) => (
                        <tr key={item._id || item.symbol + index}>
                          <td className="align-left">{index + 1}</td>
                          <td className="align-left">{item.symbol}</td>
                          <td className="align-left">
                            <span className={`side-badge ${item.type === 'buy' ? 'side-buy' : 'side-sell'}`}>
                              {item.type === 'buy' ? 'BUY' : 'SELL'}
                            </span>
                          </td>
                          <td className="align-right tabular-nums">{item.qty}</td>
                          <td className="align-right tabular-nums">{formatNumber(item.price)}</td>
                          <td className="align-right">
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelStopLoss(item._id)}
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="history-empty">
                    <p className="history-empty-title">No stop losses yet</p>
                    <p className="history-empty-subtitle">Your stop loss orders will appear here.</p>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
