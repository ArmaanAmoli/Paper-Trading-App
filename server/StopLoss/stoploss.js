import process from "node:process";
import { StopLossExecuter } from "../queryManager.js";
import { tickerToSL } from "./getAllStopLoss.js";
import { sendPushNotification } from "../Services/notificationService.js";

const url = "ws://127.0.0.1:8001/ws/quote";
const token = process.env.JWT_TOKEN_05_2036;

export let socket = null;

let reconnectTimer = null;

function createSocket() {
    // Reconnect must create a fresh websocket instance instead of reusing a dead one.
    socket = new WebSocket(url, [token]);

    socket.addEventListener("open", () => {
        console.log(`WS connected successfully - ${url}`);
        reconnectTimer = null;

        // Restore all in-memory subscriptions after reconnect.
        for (const key of tickerToSL.keys()) {
            socket.send(JSON.stringify({
                action: "subscribe",
                ticker: key
            }));
        }
    });

    socket.addEventListener("message", async (event) => {
        const receivedData = JSON.parse(event.data);
        const ticker = receivedData.ticker;
        console.log("Received data: ", receivedData);

        const StopLossesPlaced = tickerToSL.get(ticker);
        if (StopLossesPlaced === undefined) return;

        const toBeDeleted = [];

        for (const sl of StopLossesPlaced) {
            // Execute matching stop-loss orders one by one and wait for each DB action.
            if (sl.type === "buy") {
                if (receivedData.currentPrice >= sl.price) {
                    await StopLossExecuter(sl);
                    toBeDeleted.push(sl);
                    console.log("Stop loss executed", sl);
                    await sendPushNotification(sl.userId , `Paper Trading App`,`Stop Loss executed for ${sl.ticker} at price ${sl.price}`);
                }
            } else if (sl.type === "sell") {
                if (receivedData.currentPrice <= sl.price) {
                    await StopLossExecuter(sl);
                    toBeDeleted.push(sl);
                    console.log("Stop loss executed", sl);
                    await sendPushNotification(sl.userId , `Paper Trading App`,`Stop Loss executed for ${sl.ticker} at price ${sl.price}`);
                }
            }
        }

        console.log(toBeDeleted.length);

        if (toBeDeleted.length !== 0) {
            console.log("Old length:", StopLossesPlaced.length);
            const filterArray = StopLossesPlaced.filter(item => !toBeDeleted.includes(item));
            tickerToSL.set(ticker, filterArray);
            console.log("New length:", filterArray.length);
        }

        if (tickerToSL.get(ticker).length === 0) {
            socket.send(JSON.stringify({
                action: "unsubscribe",
                ticker: ticker
            }));
            tickerToSL.delete(ticker);
        }
    });

    socket.addEventListener("error", () => {
        console.log("[WS] error in stopLossWS()");
        // Let close() handle the retry so reconnect is scheduled only once.
    });

    socket.addEventListener("close", () => {
        console.log("Stop loss socket closed.");
        reconnect();
    });
}

export async function stopLossWS() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    createSocket();
}

function reconnect() {
    // Prevent multiple reconnect timers from stacking after the same disconnect.
    if (reconnectTimer) return;

    const delay = 5000;
    console.log(`[WS] Retrying connection in ${delay / 1000} seconds...`);

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        createSocket();
    }, delay);
}
