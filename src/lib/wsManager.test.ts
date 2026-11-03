import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketManager } from './wsManager';
import type { WebSocketMessage } from './wsManager';

interface FakeWebSocketInstance {
  url: string;
  protocols: string | string[] | undefined;
  readyState: number;
  sent: string[];
  closed: boolean;
  onopen: (() => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  send: (data: string) => void;
  close: () => void;
  open: () => void;
  emitMessage: (data: unknown) => void;
  payloads: Record<string, unknown>[];
}

const instances: FakeWebSocketInstance[] = [];

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readonly protocols: string | string[] | undefined;
  readyState = FakeWebSocket.CONNECTING;
  readonly sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  emitMessage(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  get payloads(): Record<string, unknown>[] {
    return this.sent.map((entry) => JSON.parse(entry) as Record<string, unknown>);
  }
}

beforeEach(() => {
  instances.length = 0;
  vi.stubGlobal('WebSocket', FakeWebSocket);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('WebSocketManager.connect', () => {
  it('opens a connection to the given url', () => {
    const manager = new WebSocketManager();

    manager.connect('quote', 'ws://localhost:8001/ws/quote');

    expect(instances).toHaveLength(1);
    expect(instances[0].url).toBe('ws://localhost:8001/ws/quote');
  });

  it('passes the stored token as a subprotocol', () => {
    localStorage.setItem('token', 'jwt-token');
    const manager = new WebSocketManager();

    manager.connect('quote', 'ws://localhost:8001/ws/quote');

    expect(instances[0].protocols).toEqual(['jwt-token']);
  });

  it('omits the subprotocol when no token is stored', () => {
    const manager = new WebSocketManager();

    manager.connect('quote', 'ws://localhost:8001/ws/quote');

    expect(instances[0].protocols).toBeUndefined();
  });
});

describe('WebSocketManager subscriptions', () => {
  it('sends a subscribe message for the first handler of a ticker', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    manager.subscriber('quote', 'AAPL', vi.fn());

    expect(instances[0].payloads).toContainEqual({ action: 'subscribe', ticker: 'AAPL' });
  });

  it('does not send a duplicate subscribe message for a second handler', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    manager.subscriber('quote', 'AAPL', vi.fn());
    manager.subscriber('quote', 'AAPL', vi.fn());

    const subscribeMessages = instances[0].payloads.filter(
      (payload) => payload.action === 'subscribe' && payload.ticker === 'AAPL',
    );
    expect(subscribeMessages).toHaveLength(1);
  });

  it('sends an unsubscribe message when the last handler is removed', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    const handler = vi.fn();
    manager.subscriber('quote', 'AAPL', handler);
    manager.unsubscriber('quote', 'AAPL', handler);

    expect(instances[0].payloads).toContainEqual({ action: 'unsubscribe', ticker: 'AAPL' });
  });

  it('does not send an unsubscribe message while another handler remains', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    const first = vi.fn();
    const second = vi.fn();
    manager.subscriber('quote', 'AAPL', first);
    manager.subscriber('quote', 'AAPL', second);
    manager.unsubscriber('quote', 'AAPL', first);

    const unsubscribeMessages = instances[0].payloads.filter(
      (payload) => payload.action === 'unsubscribe',
    );
    expect(unsubscribeMessages).toHaveLength(0);
  });

  it('ignores subscriptions for a connection that does not exist', () => {
    const manager = new WebSocketManager();

    expect(() => manager.subscriber('missing', 'AAPL', vi.fn())).not.toThrow();
    expect(() => manager.unsubscriber('missing', 'AAPL', vi.fn())).not.toThrow();
  });
});

describe('WebSocketManager message routing', () => {
  it('routes a quote message to the handler of that ticker', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    const handler = vi.fn();
    manager.subscriber('quote', 'AAPL', handler);

    instances[0].emitMessage({
      ticker: 'AAPL',
      currentPrice: 150,
      change: 2,
      percentChange: 1.4,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const received = handler.mock.calls[0][0] as WebSocketMessage;
    expect(received.ticker).toBe('AAPL');
  });

  it('does not route a quote message to a different ticker', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    const handler = vi.fn();
    manager.subscriber('quote', 'AAPL', handler);

    instances[0].emitMessage({
      ticker: 'MSFT',
      currentPrice: 300,
      change: 1,
      percentChange: 0.3,
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores messages that are not valid websocket messages', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    const handler = vi.fn();
    manager.subscriber('quote', 'AAPL', handler);

    instances[0].emitMessage({ unexpected: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores malformed json payloads', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    const handler = vi.fn();
    manager.subscriber('quote', 'AAPL', handler);

    instances[0].onmessage?.({ data: 'not-json' } as MessageEvent);

    expect(handler).not.toHaveBeenCalled();
  });

  it('routes an indicator message to the matching indicator handler', () => {
    const manager = new WebSocketManager();
    manager.connect('indicator', 'ws://localhost:8001/ws/indicator');
    instances[0].open();

    const handler = vi.fn();
    manager.subscriber('indicator', 'AAPL', handler, {
      ticker: 'AAPL',
      interval: '1h',
      indicator: 'SMA',
      timeperiod: 14,
    });

    instances[0].emitMessage({
      ticker: 'AAPL',
      interval: '1h',
      indicator: 'SMA',
      indicator_id:
        'AAPL::1h::SMA::{"indicator":"SMA","interval":"1h","ticker":"AAPL","timeperiod":14}',
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('WebSocketManager reconnect behaviour', () => {
  it('resubscribes to the tickers after a reconnect', () => {
    vi.useFakeTimers();
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote', { reconnectDelay: 10 });
    instances[0].open();

    manager.subscriber('quote', 'AAPL', vi.fn());

    instances[0].onclose?.();
    vi.advanceTimersByTime(20);

    expect(instances).toHaveLength(2);
    instances[1].open();

    expect(instances[1].payloads).toContainEqual({ action: 'subscribe', ticker: 'AAPL' });
  });

  it('does not reconnect after an explicit disconnect', () => {
    vi.useFakeTimers();
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote', { reconnectDelay: 10 });
    instances[0].open();

    manager.disconnect('quote');
    instances[0].onclose?.();

    vi.advanceTimersByTime(100);

    expect(instances).toHaveLength(1);
  });

  it('reconnects after the socket closes unexpectedly', () => {
    vi.useFakeTimers();
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote', { reconnectDelay: 10 });
    instances[0].open();

    instances[0].onclose?.();
    vi.advanceTimersByTime(20);

    expect(instances).toHaveLength(2);
  });
});

describe('WebSocketManager.disconnect', () => {
  it('closes the socket', () => {
    const manager = new WebSocketManager();
    manager.connect('quote', 'ws://localhost:8001/ws/quote');
    instances[0].open();

    manager.disconnect('quote');

    expect(instances[0].closed).toBe(true);
  });

  it('ignores a disconnect for an unknown connection', () => {
    const manager = new WebSocketManager();

    expect(() => manager.disconnect('missing')).not.toThrow();
  });
});
