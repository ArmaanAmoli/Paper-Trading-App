import { useEffect, useRef, useState } from 'react';
import { wsManager } from '../lib/wsManager';
import type { WebSocketMessage, QuoteMessage } from '../lib/wsManager';

export function useTicker(connectionName: string, ticker: string): QuoteData {
  const [data, setData] = useState<WebSocketMessage | null>(null);

  const handlerRef = useRef<(msg: WebSocketMessage) => void>(null);

  useEffect(() => {
    if (!handlerRef.current) {
      handlerRef.current = (msg) => setData(msg);
    }
  }, []);

  useEffect(() => {
    if (!ticker) return;
    const handler = handlerRef.current;
    if (!handler) return;
    wsManager.subscriber(connectionName, ticker, handler);
    return () => wsManager.unsubscriber(connectionName, ticker, handler);
  }, [connectionName, ticker]);

  if (data === null) {
    return { currentPrice: 0, change: 0, percentChange: 0 };
  }

  // Type guard to ensure we return QuoteData shape
  if (isQuoteMessage(data)) {
    return {
      currentPrice: data.currentPrice ?? 0,
      change: data.change ?? 0,
      percentChange: data.percentChange ?? 0,
    };
  }

  return { currentPrice: 0, change: 0, percentChange: 0 };
}

interface QuoteData {
  currentPrice: number;
  change: number;
  percentChange: number;
}

function isQuoteMessage(msg: WebSocketMessage): msg is QuoteMessage {
  return 'currentPrice' in msg && 'change' in msg && 'percentChange' in msg;
}
