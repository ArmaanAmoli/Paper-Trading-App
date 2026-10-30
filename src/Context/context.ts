import { createContext } from 'react';
import type React from 'react';
import type { UserDataResponse } from '@shared/contract/auth';
import type { PortfolioResponse } from '@shared/contract/trade';

export interface WatchlistContextValue {
  watchlistArrayState: [string[], React.Dispatch<React.SetStateAction<string[]>>];
  watchlistMap: Map<string, { currentPrice: number; change: number; percentChange: number }>;
}

export interface UserAccountContextValue {
  userAccountInformation: UserDataResponse | null;
  setUserAccountInformation: React.Dispatch<React.SetStateAction<UserDataResponse | null>>;
}

export interface UserEquityContextValue {
  portfolio: [
    PortfolioResponse['positions'],
    React.Dispatch<React.SetStateAction<PortfolioResponse['positions']>>,
  ];
  pnl: [
    Record<string, { Pnl: string; pChange: string }>,
    React.Dispatch<React.SetStateAction<Record<string, { Pnl: string; pChange: string }>>>,
  ];
  totalPnl: [number, React.Dispatch<React.SetStateAction<number>>];
  totalEquity: [number, React.Dispatch<React.SetStateAction<number>>];
}

export interface IndicatorListItem {
  indicator: string;
  indicatorId: string;
  title?: string;
  submitLabel?: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'number' | 'select' | 'color';
    defaultValue: unknown;
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    errorMessage?: string;
    transform?: (values: Record<string, unknown>) => Record<string, unknown>;
  }>;
  [key: string]: unknown;
}

export interface IndicatorConfig {
  indicatorId: string;
  title: string;
  submitLabel?: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'number' | 'select' | 'color';
    defaultValue: unknown;
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    errorMessage?: string;
    transform?: (values: Record<string, unknown>) => Record<string, unknown>;
  }>;
}

export interface IndicatorsListContextValue {
  indicatorList: IndicatorListItem[];
  setIndicatorList: React.Dispatch<React.SetStateAction<IndicatorListItem[]>>;
}

export interface MarketDataContextValue {
  marketDataMap: Map<string, { currentPrice: number; change: number; percentChange: number }>;
}

// Provide central watchlist array to all the elements.
export const WatchlistContext = createContext<WatchlistContextValue | null>(null);

// Contains user Account balance and blocked margin.
export const UserAccountContext = createContext<UserAccountContextValue | null>(null);

// Contains user portfolio information with pnl.
export const UserEquityContext = createContext<UserEquityContextValue | null>(null);

export const IndicatorsList = createContext<IndicatorsListContextValue | null>(null);

export const MarketData = createContext<MarketDataContextValue | null>(null);

// Export provider components for external use
export { WatchlistProvider, UserAccountProvider, UserEquityProvider, IndicatorsListProvider } from './contextProviders';
