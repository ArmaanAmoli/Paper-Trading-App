import { useEffect, useState, useRef } from 'react';
import { wsManager } from '../lib/wsManager';
import marketSymbols from '../services/Indices data/indicesFullName.json';
import { MarketData } from './context';
import type { MarketDataContextValue } from './context';
import type { WebSocketMessage } from '@shared/contract/wsMessages';

/*
Store a global mapping of useTicker hook from where all the market data can be tracked.
*/
export default function MarketDataProvider({ children }: { children: React.ReactNode }) {
  const [marketDataMap, setMarketDataMap] = useState<
    Map<string, { currentPrice: number; change: number; percentChange: number }>
  >(new Map());
  const dataRef = useRef<
    Map<string, { currentPrice: number; change: number; percentChange: number }>
  >(new Map());
  const flushPending = useRef(false);

  useEffect(() => {
    const tickers = Object.keys(marketSymbols);
    const handlers = new Map<string, (data: WebSocketMessage) => void>();
    const handler = (ticker: string) => (data: WebSocketMessage) => {
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
            setMarketDataMap(new Map(dataRef.current));
          });
        }
      }
    };

    tickers.forEach((ticker) => {
      const h = handler(ticker);
      handlers.set(ticker, h);
      wsManager.subscriber('quote', ticker, h);
    });

    return () => {
      tickers.forEach((ticker) => {
        const h = handlers.get(ticker);
        if (h) wsManager.unsubscriber('quote', ticker, h);
      });
    };
  }, []);

  const value: MarketDataContextValue = { marketDataMap };
  return <MarketData.Provider value={value}>{children}</MarketData.Provider>;
}
