import { WatchlistContext } from '../Context/context.js';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteFromWatchlist } from '../services/watchlist.js';

export default function Ticker({ name }) {
  const navigate = useNavigate();
  const { watchlistArrayState, watchlistMap } = useContext(WatchlistContext);
  const setWatchlistArray = watchlistArrayState[1];
  const quote = watchlistMap.get(name);
  const handleRowClick = () => navigate(`/chart/${name}`);

  if (!quote) {
    return (
      <tr className="h-[44px] animate-pulse">
        <td colSpan={4} className="text-text-dim px-4 py-3">
          Loading...
        </td>
      </tr>
    );
  }

  const isPositive = quote.change > 0;
  const isNegative = quote.change < 0;
  const changePrefix = isPositive ? '+' : isNegative ? '' : '';
  const rowColorClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';

  return (
    <tr
      className="group relative h-[44px] hover:bg-surface-raised transition-colors duration-150 cursor-pointer"
      onClick={handleRowClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleRowClick();
      }}
    >
      <td className="col-symbol px-[16px] pr-[8px] py-3 text-left">
        <span
          className="text-sm font-semibold text-text-primary tabular-nums truncate block"
          title={name}
        >
          {name}
        </span>
      </td>
      <td className="col-price numeric px-[8px] py-3 text-right">
        <span
          className={rowColorClass}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {quote.currentPrice.toLocaleString()}
        </span>
      </td>
      <td className="col-change numeric px-[8px] py-3 text-right">
        <span
          className={rowColorClass}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {changePrefix}
          {quote.change.toFixed(2)}
        </span>
      </td>
      <td className="col-pctchg numeric relative px-[8px] py-3 pr-[16px] text-right">
        <span
          className={rowColorClass}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {changePrefix}
          {quote.percentChange.toFixed(2)}%
        </span>
        <button
          className="remove-btn absolute right-[8px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto focus-within:pointer-events-auto z-10"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-raised)',
            boxShadow: '-12px 0 8px 0 var(--color-surface-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
          }}
          onClick={async (e) => {
            e.stopPropagation();
            const res = await deleteFromWatchlist(name);
            if (res.success) {
              setWatchlistArray((prev) => prev.filter((item) => item !== name));
            }
          }}
          aria-label={'Remove ' + name + ' from watchlist'}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-red-text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          onFocus={(e) => (e.currentTarget.style.color = 'var(--color-red-text)')}
          onBlur={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          <svg
            className="w-[14px] h-[14px]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
}
