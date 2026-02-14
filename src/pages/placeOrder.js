import axios from "axios";

export async function placeOrder(ticker, Qty, side) {
    const data =
    {
        symbol: ticker,
        qty: Qty,
        side: side
    }
    //const { symbol, qty, price, side , orderId } = positionDetails;

}