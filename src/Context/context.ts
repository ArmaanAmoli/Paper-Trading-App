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

export interface IndicatorsListContextValue {
  indicatorList: Array<Record<string, unknown>>;
  setIndicatorList: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>;
}

export interface MarketDataContextValue {
  marketDataMap: Map<string, { currentPrice: number; change: number; percentChange: number }>;
}

//Provide central watchlist array to all the elements.
export const WatchlistContext = createContext<WatchlistContextValue | null>(null);

//Contains user Account balance and blocked margin.
export const UserAccountContext = createContext<UserAccountContextValue | null>(null);

//Contains user portfolio information with pnl.
export const UserEquityContext = createContext<UserEquityContextValue | null>(null);

export const IndicatorsList = createContext<IndicatorsListContextValue | null>(null);

export const MarketData = createContext<MarketDataContextValue | null>(null);
