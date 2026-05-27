import jwt from "jsonwebtoken";
import { getAllSL, StopLossExecuter } from "../queryManager.js";
import { allStopLoss, tickerToSL } from "./getAllStopLoss.js";

const url = "ws://127.0.0.1:8001";
const token = process.env.JWT_TOKEN_05_2036;
export const socket = new WebSocket(url, [token]);

export async function stopLossWS() {
    socket.addEventListener("open", (event) => {
        console.log(`WS connected successfully - ${url}`);
        for (const key of tickerToSL.keys()) {
            ticker.push(key);
            socket.send(JSON.stringify({
                action: "subscribe",
                ticker: ticker
            }));
        }
    })

    socket.addEventListener("message", async (event) => {
        const receivedData = event.data; //price data
        console.log("Received data: " , receivedData);
        const StopLossesPlaced = tickerToSL.get(ticker);
        const { currentPrice } = receivedData;
        const toBeDeleted = [];
        StopLossesPlaced.forEach(async (sl) => {
            /*

            response = {
                "currentPrice":,
                "change":,
                "percentChange":
            } */

            //buy -> position was short, If current Price > sl price then execute.
            if (sl.type === 'buy') {
                if (receivedData >= sl.price) {
                    await StopLossExecuter(sl);
                    toBeDeleted.push(sl);
                }
            }
            //sell -> position was buy, If current Price < sl price then execute.
            else if (sl.type === 'sell') {
                if (receivedData <= sl.price) {
                    await StopLossExecuter(sl);
                    toBeDeleted.push(sl);
                }
            }
        });
        if(toBeDeleted.length != 0){
            const filterArray = StopLossesPlaced.filter(item => !toBeDeleted.includes(item));
            tickerToSL.set(ticker , filterArray);
        }
        if(tickerToSL.get(ticker).length === 0){
            socket.send(JSON.stringify({
                action:"unsubscribe",
                ticker:ticker
            }));
            tickerToSL.delete(ticker);
        }

    });

    socket.addEventListener("error" , (event)=>{
        setTimeout(stopLossWS , 5000);
    });

    socket.addEventListener("close" , (event) => {
        console.log("Stop loss socket closed gracefully.");
        return;
    })

}


