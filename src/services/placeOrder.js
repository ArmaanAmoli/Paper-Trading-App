import axios from "axios";
import clickSound from '../assets/sound/position-sound.mp3'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function placeOrder(ticker, Qty, side, stopLossOrder) {
    const jwtToken = localStorage.getItem("token");
    const config = {
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        }
    };
    const data = {
        symbol: ticker,
        qty: Qty,
        side: side
    };
    const url = `${API_BASE_URL}/${side}`;

    // Execute trade
    let tradeResult = { success: false, data: null, error: null };
    try {
        const responseOfTradeExecution = await axios.post(url, data, config);
        tradeResult = { success: true, data: responseOfTradeExecution.data };
    } catch (err) {
        tradeResult = { success: false, error: err.response?.data?.message || err.message };
    }

    // Execute stop loss if provided
    let stopLossResult = { success: false, data: null, error: null };
    if (stopLossOrder != null && stopLossOrder.qty != 0 && stopLossOrder.price != 0) {
        try {
            const responseOfStopLossPlacement = await axios.post(`${API_BASE_URL}/stopLoss`, stopLossOrder, config);
            // Server returns { message: "Stop loss order placed." } on success
            if (responseOfStopLossPlacement.data?.message) {
                stopLossResult = { success: true, data: responseOfStopLossPlacement.data };
            } else {
                stopLossResult = { success: false, error: 'Unexpected stop loss response' };
            }
        } catch (err) {
            stopLossResult = { success: false, error: err.response?.data?.message || err.message };
        }
    }

    const audio = new Audio(clickSound);
    audio.play();

    return { trade: tradeResult, stopLoss: stopLossResult };
}