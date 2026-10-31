import { useEffect, useState, useContext } from 'react';
import { UserAccountContext, UserEquityContext } from '../Context/context';
import { getTradeHistory } from '../services/tradeHistory';
import { useNavigate } from 'react-router-dom';
import { formatNumber, formatSignedNumber, getValueColorClass } from '../lib/formatters';
import Avatar from '../Components/Avatar';
import { toast } from 'react-toastify';
import './styles/userProfile.css';
import type { TradeHistoryResponse } from '@shared/contract/trade';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function UserProfile() {
  const userAccount = useContext(UserAccountContext);
  const userEquity = useContext(UserEquityContext);
  
  const userData = userAccount?.userAccountInformation ?? null;
  const equity = userEquity?.totalEquity?.[0] ?? 0;
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryResponse | null>(null);
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    async function fetchTradeHistory() {
      const data = await getTradeHistory();
      if (data) {
        setTradeHistory(data);
      }
    }
    void fetchTradeHistory();
    const intervalId = setInterval(fetchTradeHistory, 10000);
    return () => clearInterval(intervalId);
  }, []);

  function logOut() {
    localStorage.removeItem('token');
    void navigate('/', { replace: true });
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_BASE_URL}/user/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.removeItem('token');
        toast.success('Account deleted');
        setShowDeleteModal(false);
        void navigate('/', { replace: true });
      } else {
        setDeleteError(data.message || 'Failed to delete account');
      }
    } catch (err) {
      console.error(err);
      setDeleteError('Something went wrong. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const balance = userData?.balance ?? 0;
  const blockedMargin = userData?.blockedMargin ?? 0;
  const holdingsValue = equity;
  const totalEquityValue = balance + equity;

  const formatDate = (dateString: string) => {
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

  const formatMemberSince = (dateString: string) => {
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
                <Avatar name={userData?.username} avatar={userData?.avatar} size={64} />
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
                  <dd className="profile-detail-value">{formatMemberSince(userData?.createdAt ?? '')}</dd>
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
                <button type="button" className="btn btn-secondary" onClick={() => void logOut()}>
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
                  onClick={openDeleteModal}
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

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={closeDeleteModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>            <header className="modal-header">
              <h2 id="delete-modal-title" className="modal-title">Delete your account?</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeDeleteModal}
                aria-label="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className="modal-body">
              <p className="modal-text">
                This will permanently delete your account, all trades, holdings, watchlist, and associated data. This action cannot be undone.
              </p>
              <div className="modal-confirm-input">
                <label htmlFor="delete-confirm" className="modal-confirm-label">
                  Type "DELETE" to confirm:
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="auth-input"
                  placeholder="DELETE"
                  autoFocus
                  disabled={isDeleting}
                />
              </div>
              {deleteError && (
                <p className="auth-error" role="alert" style={{ marginTop: '12px' }}>
                  {deleteError}
                </p>
              )}
            </div>

            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary modal-cancel"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger modal-delete"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
