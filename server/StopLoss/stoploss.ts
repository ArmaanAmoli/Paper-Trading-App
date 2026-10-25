import { WebSocket } from 'ws';
import { StopLossExecuter } from '../queryManager.js';
import { tickerToSL } from './getAllStopLoss.js';
import { sendPushNotification } from '../Services/notificationService.js';
import { getEnv } from '../lib/env.js';
import type { StopLossDocument } from '../Schemas/mongoSchema.js';

const env = getEnv();
const url = env.FAST_API_WEB_SOCKET_SERVER_DOMAIN + '/ws/quote';
const token = env.JWT_TOKEN_05_2036;

export let socket: WebSocket | null = null;

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

interface QuoteMessage {
  ticker: string;
  currentPrice: number;
}

function createSocket(): Promise<void> {
  return new Promise<void>((resolve) => {
    socket = new WebSocket(url, [token]);

    socket.addEventListener('open', () => {
      console.log(`WS connected successfully - ${url}`);
      reconnectTimer = null;

      for (const key of tickerToSL.keys()) {
        socket?.send(
          JSON.stringify({
            action: 'subscribe',
            ticker: key,
          }),
        );
      }
      resolve();
    });

    socket.addEventListener('message', (event: WebSocket.MessageEvent) => {
      const receivedData = JSON.parse(event.data as string) as QuoteMessage;
      const ticker = receivedData.ticker;
      console.log('Received data: ', receivedData);

      const StopLossesPlaced = tickerToSL.get(ticker);
      if (StopLossesPlaced === undefined) return;

      const toBeDeleted: StopLossDocument[] = [];

      for (const sl of StopLossesPlaced) {
        if (sl.type === 'buy') {
          if (receivedData.currentPrice >= sl.price) {
            void StopLossExecuter({
              userId: String(sl.userId),
              symbol: sl.symbol,
              price: sl.price,
              startDate: sl.startDate.toISOString(),
              qty: sl.qty,
              type: sl.type,
            });
            toBeDeleted.push(sl);
            console.log('Stop loss executed', sl);
            void sendPushNotification(
              String(sl.userId),
              `Paper Trading App`,
              `Stop Loss executed for ${sl.symbol} at price ${sl.price}`,
            );
          }
        } else if (sl.type === 'sell') {
          if (receivedData.currentPrice <= sl.price) {
            void StopLossExecuter({
              userId: String(sl.userId),
              symbol: sl.symbol,
              price: sl.price,
              startDate: sl.startDate.toISOString(),
              qty: sl.qty,
              type: sl.type,
            });
            toBeDeleted.push(sl);
            console.log('Stop loss executed', sl);
            void sendPushNotification(
              String(sl.userId),
              `Paper Trading App`,
              `Stop Loss executed for ${sl.symbol} at price ${sl.price}`,
            );
          }
        }
      }

      console.log(toBeDeleted.length);

      if (toBeDeleted.length !== 0) {
        console.log('Old length:', StopLossesPlaced.length);
        const filterArray = StopLossesPlaced.filter(
          (item: StopLossDocument) => !toBeDeleted.includes(item),
        );
        tickerToSL.set(ticker, filterArray);
        console.log('New length:', filterArray.length);
      }

      const remaining = tickerToSL.get(ticker);
      if (remaining && remaining.length === 0) {
        socket?.send(
          JSON.stringify({
            action: 'unsubscribe',
            ticker: ticker,
          }),
        );
        tickerToSL.delete(ticker);
      }
    });

    socket.addEventListener('error', () => {
      console.log('[WS] error in stopLossWS()');
    });

    socket.addEventListener('close', () => {
      console.log('Stop loss socket closed.');
      reconnect();
    });

    socket.addEventListener(
      'open',
      () => {
        // Already resolved in the promise constructor
      },
      { once: true },
    );
    resolve();
  });
}

export async function stopLossWS(): Promise<void> {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  await createSocket();
}

function reconnect(): void {
  if (reconnectTimer) return;

  const delay = 5000;
  console.log(`[WS] Retrying connection in ${delay / 1000} seconds...`);

  void setTimeout(() => {
    reconnectTimer = null;
    void createSocket();
  }, delay);
}
