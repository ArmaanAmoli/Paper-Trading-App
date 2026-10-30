import Ticker from './ticker';
import { useState, useContext } from 'react';
import SearchTabPopUp from './floatingSearchTab';
import { createPortal } from 'react-dom';
import { WatchlistContext } from '../Context/context';

export default function Watchlist() {
  const [searchTabOpen, setSearchTabOpen] = useState(false);
  const toggleSearchTab = () => setSearchTabOpen((prev) => !prev);
  const context = useContext(WatchlistContext);
  const watchlistArray = context?.watchlistArrayState?.[0] ?? [];

  return (
    <div className="panel h-full min-h-0 flex flex-col overflow-hidden">
      {searchTabOpen && createPortal(<SearchTabPopUp close={toggleSearchTab} />, document.body)}

      <div className="stock-list w-full h-full min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-text-primary">Watchlist</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSearchTab}
              className="btn btn-icon btn-pill"
              aria-label="Add symbol to watchlist"
            >
              <svg
                className="w-5 h-5 text-text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <button className="btn btn-icon btn-pill" aria-label="Edit watchlist">
              <svg
                className="w-5 h-5 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table watchlist-table" role="grid">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="numeric">Price</th>
                <th className="numeric">Change</th>
                <th className="numeric">%Chg</th>
              </tr>
            </thead>
            <tbody>
              {watchlistArray && watchlistArray.length > 0 ? (
                watchlistArray.map((tick) => <Ticker key={tick} name={tick} />)
              ) : (
                <tr>
                  <td colSpan={4} className="text-text-muted text-sm px-4 py-8 text-center">
                    No symbols in watchlist. Click + to add.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
