import { useEffect, useState, useContext } from 'react';
import { UserAccountContext, UserEquityContext } from '../Context/context.js';
import { getTradeHistory } from '../services/tradeHistory.js';
import { useNavigate } from 'react-router-dom';
import { formatNumber, formatSignedNumber, getValueColorClass } from '../lib/formatters.js';
import Avatar from '../Components/Avatar.jsx';
import './styles/userProfile.css';

export default function UserProfile() {
  const [userData] = useContext(UserAccountContext);
  const { totalEquity } = useContext(UserEquityContext);
  const [Equity] = totalEquity || [0];
  const [tradeHistory, setTradeHistory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTradeHistory() {
      const data = await getTradeHistory();
      if (data) {
        setTradeHistory(data);
      }
    }
    fetchTradeHistory();
    const intervalId = setInterval(fetchTradeHistory, 10000);
    return () => clearInterval(intervalId);
  }, []);

  function logOut() {
    localStorage.removeItem('token');
    navigate('/', { replace: true });
  }

  const balance = userData?.balance ?? 0;
  const blockedMargin = userData?.blockedMargin ?? 0;
  const equity = Equity ?? 0;
  const holdingsValue = equity;
  const totalEquityValue = balance + equity;

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatMemberSince = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Page Header */}
        <header className="profile-header">
          <h1 className="profile-title">Profile</h1>
          <p className="profile-subtitle">Your account details, balances, and trade history</p>
        </header>

        {/* Main Layout Grid */}
        <div className="profile-grid">
          {/* Left Column: Profile Card */}
          <aside className="profile-card-wrapper">
            <div className="profile-card">
              {/* Avatar & Name */}
              <div className="profile-top">
                <Avatar name={userData?.username} size={64} />
                <div className="profile-identity">
                  <h2 className="profile-name">{userData?.username ?? '--'}</h2>
                  <p className="profile-email">{userData?.email ?? '--'}</p>
                </div>
              </div>

              <hr className="profile-divider" />

              {/* Details */}
              <dl className="profile-details">
                <div className="profile-detail">
                  <dt className="profile-detail-label">User ID</dt>
                  <dd className="profile-detail-value">{userData?._id ?? '--'}</dd>
                </div>
                <div className="profile-detail">
                  <dt className="profile-detail-label">Member since</dt>
                  <dd className="profile-detail-value">{formatMemberSince(userData?.createdAt)}</dd>
                </div>
              </dl>

              <hr className="profile-divider" />

              {/* Actions */}
              <div className="profile-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={true} // No handler implemented yet
                >
                  Update Profile
                </button>
                <button type="button" className="btn btn-secondary" onClick={logOut}>
                  Log out
                </button>
              </div>

              {/* Danger Zone */}
              <hr className="profile-divider" />
              <div className="profile-danger-zone">
                <p className="danger-text">Permanently delete your account and all data.</p>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={true} // Existing handler/confirmation stays as-is
                >
                  Delete Account
                </button>
              </div>
            </div>
          </aside>

          {/* Right Column */}
          <main className="profile-main">
            {/* Stat Cards */}
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

            {/* Trade History Table */}
            <section className="history-card">
              <header className="history-header">
                <h2 className="history-title">Trade history</h2>
                <span className="history-count">
                  {tradeHistory && tradeHistory.length > 0 ? tradeHistory.length : 0}
                </span>
              </header>
              <div className="history-table-wrapper">
                {tradeHistory && tradeHistory.length > 0 ? (
                  <table className="history-table" role="grid">
                    <colgroup>
                      <col style={{ width: '72px' }} />
                      <col style={{ minWidth: '120px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '190px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="align-left">S.NO</th>
                        <th className="align-left">SYMBOL</th>
                        <th className="align-left">SIDE</th>
                        <th className="align-right">QTY</th>
                        <th className="align-right">REALIZED PNL</th>
                        <th className="align-right">TIMESTAMP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeHistory.map((item, index) => {
                        const pnlValue = Number(item.realizedPL);
                        const pnlColorClass = getValueColorClass(pnlValue);
                        const pnlDisplay = formatSignedNumber(pnlValue);
                        const side = (item.type || '').toLowerCase();
                        const sideLabel = side === 'buy' ? 'BUY' : 'SELL';
                        const sideClass = side === 'buy' ? 'side-buy' : 'side-sell';

                        return (
                          <tr key={item._id || item.symbol + index}>
                            <td className="align-left">{index + 1}</td>
                            <td className="align-left">{item.symbol}</td>
                            <td className="align-left">
                              <span className={`side-badge ${sideClass}`}>{sideLabel}</span>
                            </td>
                            <td className="align-right tabular-nums">{item.shares}</td>
                            <td className={`align-right tabular-nums ${pnlColorClass}`}>
                              {pnlDisplay}
                            </td>
                            <td className="align-right">{formatDate(item.timestamp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="history-empty">
                    <p className="history-empty-title">No trades yet</p>
                    <p className="history-empty-subtitle">Your executed orders will appear here.</p>
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
