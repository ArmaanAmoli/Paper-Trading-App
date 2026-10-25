import { useState, useRef, useEffect } from 'react';
import api from '../services/api.js';
import SearchResultComponent from './searchResultComponent.jsx';
export default function SearchTabPopUp({ close }) {
  const [userInput, setUserInput] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  let key = 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (event) => {
    setUserInput(event.target.value);
  };

  async function handleClick() {
    if (!userInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.get('/search', {
        params: { query: userInput },
      });
      setSearchResult(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleClick();
    if (e.key === 'Escape') close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-dialog-title"
    >
      <div
        className="w-full max-w-md h-[60vh] max-h-[500px] bg-surface border border-border rounded-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <h2 id="search-dialog-title" className="text-sm font-semibold text-text-primary">
            Add to Watchlist
          </h2>
          <button
            onClick={close}
            className="ml-auto p-1.5 rounded-full hover:bg-surface-raised transition-colors duration-150 focus:ring-2 focus:ring-blue focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Close search"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <label htmlFor="search-input" className="sr-only">
              Search symbols
            </label>
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              value={userInput}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Search symbols (e.g. AAPL, RELIANCE)..."
              className="flex-1 px-4 py-2.5 text-sm bg-background border border-border rounded-lg placeholder-text-muted focus:border-blue focus:ring-2 focus:ring-blue/20 focus:bg-surface transition-all duration-150"
              aria-autocomplete="list"
            />
            <button
              onClick={handleClick}
              disabled={isLoading || !userInput.trim()}
              className="p-2.5 bg-blue hover:bg-blue-hover text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus:ring-2 focus:ring-blue focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Search"
            >
              {isLoading ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
          {searchResult && searchResult.length > 0 ? (
            <div className="space-y-2" role="listbox" aria-label="Search results">
              {searchResult.map((ticker) => (
                <div key={key++} className="relative">
                  <SearchResultComponent info={ticker} />
                </div>
              ))}
            </div>
          ) : userInput.trim() && !isLoading ? (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              No results found for "{userInput}"
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin text-blue"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Searching...
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              Type a symbol to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
