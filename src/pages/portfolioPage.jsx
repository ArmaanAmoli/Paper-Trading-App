import { useContext } from "react";
import './styles/portfolioPage.css';
import { UserAccountContext, UserEquityContext } from "../Context/context.js";
import {
  formatNumber,
  formatSignedNumber,
  formatPercent,
  getValueColorClass,
  getSideBadgeClass,
  getSideLabel
} from "../lib/formatters.js";

export default function PortfolioPage() {
  const [userAccountInformation] = useContext(UserAccountContext);
  
  // Properly destructure the context value (object with tuple properties)
  const { portfolio, pnl, totalPnl, totalEquity } = useContext(UserEquityContext);
  const [assetList] = portfolio || [];
  const [prices] = pnl;
  const [totalPnlValue] = totalPnl;
  const [Equity] = totalEquity;

  const balance = userAccountInformation?.balance ?? 0;
  const equity = Equity ?? 0;
  const totalEquityValue = balance + equity;

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
            <span className="positions-count-badge">
              {assetList?.length ?? 0}
            </span>
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
                  {assetList.map((item, index) => {
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
                          <span className={`side-badge ${sideBadgeClass}`}>
                            {sideLabel}
                          </span>
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
      </div>
    </div>
  );
}