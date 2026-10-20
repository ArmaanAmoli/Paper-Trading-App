import { useState, useRef, useEffect, useContext } from "react";
import { IndicatorsList } from "../Context/context.js";

const INDICATORS = [
  { id: 'SMA', code: 'MA', fullName: 'Moving Average' },
  { id: 'BBAND', code: 'BB', fullName: 'Bollinger Bands' },
  { id: 'RSI', code: 'RSI', fullName: 'Relative Strength Index' },
  { id: 'VOL', code: 'VOL', fullName: 'Volume' },
  { id: 'STOCH', code: 'SO', fullName: 'Stochastic Oscillator' },
];

export default function IndicatorsDropdown({ interval }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [indicatorList] = useContext(IndicatorsList);

  // Count active indicators that match our list
  const activeCount = INDICATORS.filter(ind =>
    indicatorList.some(item => item.indicator === ind.id)
  ).length;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleIndicatorClick = (indicator) => {
    const isActive = indicatorList.some(item => item.indicator === indicator.id);
    
    if (!isActive) {
      // Inactive: close menu and open popup
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('open-indicator-popup', {
        detail: { indicator: indicator.id, interval }
      }));
    } else {
      // Active: keep existing behavior (toggle off or open settings)
      // For now, we'll open the settings popup for active indicators too
      window.dispatchEvent(new CustomEvent('open-indicator-popup', {
        detail: { indicator: indicator.id, interval }
      }));
    }
  };

  const renderIndicatorItem = (indicator) => {
    const isActive = indicatorList.some(item => item.indicator === indicator.id);
    return (
      <button
        key={indicator.id}
        type="button"
        className="indicator-menu-item"
        onClick={() => handleIndicatorClick(indicator)}
        role="menuitemcheckbox"
        aria-checked={isActive}
        tabIndex={-1}
      >
        <div className="indicator-menu-item-label">
          <span className="indicator-menu-item-code">{indicator.code}</span>
          <span className="indicator-menu-item-name">{indicator.fullName}</span>
        </div>
        <div className="indicator-menu-item-check" aria-hidden="true">
          {isActive && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="indicators-dropdown" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        className="indicators-dropdown-btn"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Indicators menu"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Indicators</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
        {activeCount > 0 && (
          <span className="indicator-count-badge">{activeCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="indicators-dropdown-menu" role="menu">
          {INDICATORS.map(renderIndicatorItem)}
        </div>
      )}
    </div>
  );
}