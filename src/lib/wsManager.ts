/*
This class will manage multiple websockets connection with auto reconnect
*/

export interface ConnectionEntry {
  url: string;
  reconnectDelay: number;
  shouldReconnect: boolean;
  ws: WebSocket | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  subscribers: Record<string, Set<(data: WebSocketMessage) => void>>;
  indicatorSubscriptions: Record<string, IndicatorSubscription>;
}

export interface IndicatorSubscription {
  ticker: string;
  interval: string;
  indicator: string;
  properties: Record<string, unknown>;
}

export interface QuoteMessage {
  ticker: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  [key: string]: unknown;
}

export interface IndicatorMessage {
  indicator: string;
  interval: string;
  ticker: string;
  indicator_id?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export type WebSocketMessage = QuoteMessage | IndicatorMessage;

export class WebSocketManager {
  private connections: Record<string, ConnectionEntry> = {};

  /**
   * Build a stable indicator key by sorting property names.
   * Matches the backend's indicator_id format exactly.
   */
  private _buildIndicatorKey(properties: Record<string, unknown>): string {
    const sortedProperties = Object.keys(properties)
      .sort()
      .reduce(
        (accumulator, key) => {
          accumulator[key] = properties[key];
          return accumulator;
        },
        {} as Record<string, unknown>,
      );

    return `${String(properties.ticker)}::${String(properties.interval)}::${String(properties.indicator)}::${JSON.stringify(sortedProperties)}`;
  }

  /**
   * Connect to a WebSocket endpoint
   * @param name - label for the connection
   * @param url - WebSocket endpoint URL
   * @param options - optional settings (reconnectDelay)
   */
  connect(name: string, url: string, options: { reconnectDelay?: number } = {}): void {
    const { reconnectDelay = 3000 } = options;

    if (this.connections[name]?.ws?.readyState === WebSocket.OPEN) return;

    const entry: ConnectionEntry = {
      url,
      reconnectDelay,
      shouldReconnect: true,
      ws: null,
      reconnectTimer: null,
      subscribers: {},
      indicatorSubscriptions: {},
    };
    this.connections[name] = entry;
    this._open(name);
  }

  private _open(name: string): void {
    const entry = this.connections[name];
    if (!entry || !entry.shouldReconnect) return;

    const token = localStorage.getItem('token') ?? '';
    // Only pass protocol array if token exists (empty string is not a valid subprotocol)
    const ws = token ? new WebSocket(entry.url, [token]) : new WebSocket(entry.url);
    entry.ws = ws;

    ws.onopen = () => {
      console.log(`[WS:${name}] connected`);
      clearTimeout(entry.reconnectTimer ?? undefined);

      // Resubscribe all tickers after reconnecting
      Object.keys(entry.subscribers).forEach((key) => {
        try {
          const parsed = JSON.parse(key) as Record<string, unknown>;
          const ticker = (parsed.ticker as string) || '';
          const interval = parsed.interval as string;
          const indicator = parsed.indicator as string;
          const message = {
            action: 'subscribe' as const,
            ticker,
            interval,
            indicator,
            properties: parsed,
          };
          this._send(name, message);
        } catch {
          // Not JSON => treat as plain ticker
          this._send(name, { action: 'subscribe' as const, ticker: key });
        }
      });

      // Resubscribe indicator streams using stored metadata
      Object.values(entry.indicatorSubscriptions).forEach((subscription) => {
        this._send(name, {
          action: 'subscribe' as const,
          ticker: subscription.ticker,
          interval: subscription.interval,
          indicator: subscription.indicator,
          properties: subscription.properties,
        });
      });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const rawData = JSON.parse(event.data as string) as unknown;
        // Type guard to check if data is a valid WebSocketMessage
        const isWebSocketMessage = (msg: unknown): msg is WebSocketMessage =>
          typeof msg === 'object' &&
          msg !== null &&
          (('ticker' in msg && typeof (msg as Record<string, unknown>).ticker === 'string') ||
            ('indicator' in msg &&
              'interval' in msg &&
              typeof (msg as Record<string, unknown>).indicator === 'string' &&
              typeof (msg as Record<string, unknown>).interval === 'string'));

        if (!isWebSocketMessage(rawData)) return;
        const data = rawData;

        // Type guard to check if data is an IndicatorMessage
        const isIndicatorMessage = (msg: WebSocketMessage): msg is IndicatorMessage =>
          'indicator' in msg &&
          'interval' in msg &&
          msg.indicator !== null &&
          msg.interval !== null;

        // Check if this is an indicator update or a quote update
        if (isIndicatorMessage(data)) {
          // INDICATOR UPDATE
          const indicatorData = data;
          const indicatorId =
            'indicator_id' in indicatorData && indicatorData.indicator_id
              ? String(indicatorData.indicator_id)
              : this._buildIndicatorKey({
                  ticker: String(indicatorData.ticker),
                  interval: String(indicatorData.interval),
                  indicator: String(indicatorData.indicator),
                  ...((indicatorData.properties as Record<string, unknown>) ?? {}),
                });
          let handlers = entry.subscribers[indicatorId];

          // Debug logging
          try {
            console.debug(
              `[WS:${name}] indicator message for ${indicatorId} — handlers: ${handlers ? handlers.size : 0}`,
            );
          } catch {
            // ignore logging errors
          }

          // Fallback: match by prefix if exact lookup fails
          if (!handlers) {
            const prefix = `${String(data.ticker)}::${String(data.interval)}::${String(data.indicator)}::`;
            const matched = Object.keys(entry.subscribers).filter((k) => k.startsWith(prefix));
            if (matched.length) {
              handlers = new Set();
              matched.forEach((k) => {
                const s = entry.subscribers[k];
                if (s) s.forEach((fn) => handlers.add(fn));
              });
              console.debug(
                `[WS:${name}] indicator message matched ${matched.length} subscriber keys by prefix`,
              );
            }
          }

          if (handlers) {
            handlers.forEach((fn) => fn(data));
          }
        } else if (data.ticker) {
          // QUOTE UPDATE
          const ticker = String(data.ticker);
          const handlers = entry.subscribers[ticker];
          if (handlers) {
            handlers.forEach((fn) => fn(data));
          }
        }
      } catch (e) {
        console.warn(`[WS:${name}] bad JSON`, e);
      }
    };

    ws.onclose = () => {
      console.log(`[WS:${name}] closed — retrying in ${entry.reconnectDelay}ms`);
      if (entry.shouldReconnect) {
        entry.reconnectTimer = setTimeout(() => this._open(name), entry.reconnectDelay);
      }
    };

    ws.onerror = (err: Event) => console.error(`[WS:${name}] error`, err);
  }

  /**
   * Subscribe to a ticker or indicator
   * @param name - connection name
   * @param ticker - ticker symbol
   * @param handler - callback function
   * @param properties - indicator properties (for indicator subscriptions)
   */
  subscriber(
    name: string,
    ticker: string,
    handler: (data: WebSocketMessage) => void,
    properties?: Record<string, unknown>,
  ): void {
    const entry = this.connections[name];
    if (!entry) return;

    if (!properties) {
      // Quote subscription (3 arguments)
      if (!entry.subscribers[ticker]) entry.subscribers[ticker] = new Set();
      const isFirst = entry.subscribers[ticker].size === 0;
      entry.subscribers[ticker].add(handler);
      if (isFirst) {
        this._send(name, { action: 'subscribe' as const, ticker });
        console.log(`WS-${name}:${ticker} subscribed`);
      }
    } else {
      // Indicator subscription (4 arguments)
      const interval = properties.interval as string;
      const indicator = properties.indicator as string;
      const id = this._buildIndicatorKey({ ticker, interval, indicator, ...properties });

      if (!entry.subscribers[id]) {
        entry.subscribers[id] = new Set();
      }
      const isFirst = entry.subscribers[id].size === 0;
      entry.subscribers[id].add(handler);
      if (isFirst) {
        const message = { action: 'subscribe' as const, ticker, interval, indicator, properties };
        this._send(name, message);
        console.log(`WS-${name}:${id} subscribed`);
        // Keep subscription metadata for reconnects
        entry.indicatorSubscriptions[id] = { ticker, interval, indicator, properties };
      }
    }
  }

  /**
   * Unsubscribe from a ticker or indicator
   * @param name - connection name
   * @param ticker - ticker symbol
   * @param handler - callback function
   * @param properties - indicator properties (for indicator unsubscriptions)
   */
  unsubscriber(
    name: string,
    ticker: string,
    handler: (data: WebSocketMessage) => void,
    properties?: Record<string, unknown>,
  ): void {
    const entry = this.connections[name];
    if (!entry) return;

    if (!properties) {
      // Quote unsubscription (3 arguments)
      if (entry.subscribers[ticker]) {
        entry.subscribers[ticker].delete(handler);
        if (entry.subscribers[ticker].size === 0) {
          this._send(name, { action: 'unsubscribe' as const, ticker });
          delete entry.subscribers[ticker];
          console.log(`WS-${name}:${ticker} unsubscribed`);
        }
      }
    } else {
      // Indicator unsubscription (4 arguments)
      const interval = properties.interval as string;
      const indicator = properties.indicator as string;
      const id = this._buildIndicatorKey({ ticker, interval, indicator, ...properties });

      if (entry.subscribers[id]) {
        entry.subscribers[id].delete(handler);

        if (entry.subscribers[id].size === 0) {
          delete entry.subscribers[id];
          delete entry.indicatorSubscriptions[id];
          this._send(name, {
            action: 'unsubscribe' as const,
            ticker,
            interval,
            indicator,
            properties,
          });
          console.log(`WS-${name}:${id} unsubscribed`);
        }
      } else {
        console.warn(`WS-${name}:${id} was not subscribed`);
      }
    }
  }

  private _send(name: string, payload: Record<string, unknown>): void {
    const ws = this.connections[name]?.ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  /** Disconnect and clean up a connection */
  disconnect(name: string): void {
    const entry = this.connections[name];
    if (!entry) return;
    entry.shouldReconnect = false;
    clearTimeout(entry.reconnectTimer ?? undefined);
    entry.ws?.close();
    delete this.connections[name];
  }
}

export const wsManager = new WebSocketManager(); // one Manager for the entire app
