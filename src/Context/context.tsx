import { useEffect, useState, useRef } from 'react';
import type React from 'react';
import {
  WatchlistContext,
  UserAccountContext,
  UserEquityContext,
  IndicatorsList,
  type WatchlistContextValue,
  type UserAccountContextValue,
  type UserEquityContextValue,
  type IndicatorsListContextValue,
} from './context';
import api from '../services/api';
import { fetchQuote } from '../services/dataRequesterForCharts';
import { getWatchlist } from '../services/watchlist';
import { wsManager } from '../lib/wsManager';
import type { UserDataResponse } from '@shared/contract/auth';
import type { PortfolioResponse } from '@shared/contract/trade';
import type { WebSocketMessage } from '@shared/contract/wsMessages';

/*Provide the watchlist array state to all the elements
so that we can add a new element to watchlist from anywhere*/
export const WatchlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [watchlistArray, setWatchlistArray] = useState<string[]>([]);
  const [watchlistMap, setWatchListMap] = useState<
    Map<string, { currentPrice: number; change: number; percentChange: number }>
  >(new Map());
  const dataRef = useRef<
    Map<string, { currentPrice: number; change: number; percentChange: number }>
  >(new Map());
  const flushPending = useRef(false);

  useEffect(() => {
    async function fetchWatchlistData() {
      const res = await getWatchlist();
      setWatchlistArray(res.symbols);
      console.log('Fetch effect watchilst', res.symbols);
    }
    void fetchWatchlistData(); //Getting watchlist array form the database;
    const intervalID = setInterval(fetchWatchlistData, 10000);
    return () => clearInterval(intervalID);
  }, []);

  useEffect(() => {
    // console.log("Subscribe effect watchlist: " , watchlistArray)
    const handlers = new Map<string, (data: WebSocketMessage) => void>();
    watchlistArray.forEach((ticker) => {
      const handler = (data: WebSocketMessage) => {
        // Type guard to ensure we only handle quote messages
        if (
          'ticker' in data &&
          'currentPrice' in data &&
          'change' in data &&
          'percentChange' in data
        ) {
          dataRef.current.set(ticker, data);
          if (!flushPending.current) {
            flushPending.current = true;
            requestAnimationFrame(() => {
              flushPending.current = false;
              setWatchListMap(new Map(dataRef.current));
            });
          }
        }
      };
      handlers.set(ticker, handler);
      wsManager.subscriber('quote', ticker, handler);
    });

    return () => {
      watchlistArray.forEach((ticker) => {
        const handler = handlers.get(ticker);
        if (handler) wsManager.unsubscriber('quote', ticker, handler);
      });
    };
  }, [watchlistArray]);

  const value: WatchlistContextValue = {
    watchlistArrayState: [watchlistArray, setWatchlistArray],
    watchlistMap: watchlistMap,
  };

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
};

/* Provider for user account information balance and blocked margin*/
export const UserAccountProvider = ({ children }: { children: React.ReactNode }) => {
  const [userAccountInformation, setUserAccountInformation] = useState<UserDataResponse | null>(
    null,
  );
  useEffect(() => {
    async function collectUserAccInfo() {
      try {
        const res = await api.get<UserDataResponse>('/user-data');
        const resData = res.data;
        // console.log(resData);
        setUserAccountInformation(resData);
        return;
      } catch (err) {
        console.log(
          'An Error Occurred while collecting userAccountInformation in context.tsx Error: ',
          err,
        );
        return;
      }
    }

    void collectUserAccInfo();
    const intervalId = setInterval(collectUserAccInfo, 10000);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const value: UserAccountContextValue = {
    userAccountInformation: userAccountInformation ?? {
      _id: '',
      username: '',
      email: '',
      balance: 0,
      blockedMargin: 0,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      notificationSubscription: null,
    },
    setUserAccountInformation,
  };

  return <UserAccountContext.Provider value={value}>{children}</UserAccountContext.Provider>;
};

/*Provider for use portfolio and pnl list */
export const UserEquityProvider = ({ children }: { children: React.ReactNode }) => {
  const [userPortfolio, setUserPortfolio] = useState<PortfolioResponse['positions']>([]);
  const [userPnlList, setUserPnlList] = useState<Record<string, { Pnl: string; pChange: string }>>(
    {},
  );
  const [totalPnl, setTotalPnl] = useState<number>(0);
  const [Equity, setEquity] = useState<number>(0);

  useEffect(() => {
    async function updateUserPnlList(portfolio: PortfolioResponse['positions']) {
      try {
        if (!Array.isArray(portfolio) || portfolio.length === 0) {
          setUserPnlList({});
          setTotalPnl(0);
          return;
        }

        //collecting the current prices for all the symbols in portfolio
        const quotes = await Promise.all(portfolio.map((item) => fetchQuote(item.symbol)));
        // console.log("Quotes", quotes);
        // Keep in mind that order of symbols in quotes and userPortfolio is same
        const updatedData: Record<string, { Pnl: string; pChange: string }> = {}; //will store fresh calculated pnl data
        let total: number = 0; //consist the sum of pnl which will later be added to equity

        let equity: number = 0;
        quotes.forEach((quote, index) => {
          const item = portfolio[index];

          const stockPnl = Number((quote.currentPrice - item.avgPrice) * item.shares);

          const priceChangePercent = Number(
            ((quote.currentPrice - item.avgPrice) / item.avgPrice) * 100,
          );

          updatedData[item.symbol] = {
            Pnl: stockPnl.toFixed(2),
            pChange:
              item.shares >= 0 ? priceChangePercent.toFixed(2) : (-priceChangePercent).toFixed(2),
          };

          total += Number(stockPnl.toFixed(2));
          equity = equity + Number(quote.currentPrice) * Number(item.shares);
        });
        setUserPnlList(updatedData);
        setTotalPnl(total);
        setEquity(equity);
      } catch (err) {
        console.log('An error occurred while collecting userPnL Error: ', err);
        return;
      }
    }

    async function updateUserPortfolio() {
      try {
        const res = await api.get<PortfolioResponse>('/portfolio');
        const resData = res.data;
        // console.log(resData.positions);
        const positions = resData.positions || [];
        setUserPortfolio(positions);
        await updateUserPnlList(positions);
        return;
      } catch (err) {
        console.log('An error occurred while collecting userPortfolio Error: ', err);
        return;
      }
    }
    void updateUserPortfolio();
    const intervalID = setInterval(updateUserPortfolio, 10000);
    return () => {
      clearInterval(intervalID);
    };
  }, []);

  const value: UserEquityContextValue = {
    portfolio: [userPortfolio, setUserPortfolio],
    pnl: [userPnlList, setUserPnlList],
    totalPnl: [totalPnl, setTotalPnl],
    totalEquity: [Equity, setEquity],
  };

  return <UserEquityContext.Provider value={value}>{children}</UserEquityContext.Provider>;
};

export const IndicatorsListProvider = ({ children }: { children: React.ReactNode }) => {
  const [indicatorList, setIndicatorList] = useState<Array<Record<string, unknown>>>([]);
  const value: IndicatorsListContextValue = {
    indicatorList,
    setIndicatorList,
  };
  return <IndicatorsList.Provider value={value}>{children}</IndicatorsList.Provider>;
};
