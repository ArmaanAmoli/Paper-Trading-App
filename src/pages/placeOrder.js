import axios from "axios";
export async function placeOrder(ticker, Qty, side) {
    // const {currentPrice} = await fetchQuote(ticker);
    const jwtToken = localStorage.getItem("token")
    const config = {
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json' // Often set by default, but good practice to include
        }
    };
    const data =
    {
        // price:currentPrice,
        symbol: ticker,
        qty: Qty,
        side: side
    }
    const url = `http:/localhost:3000/${side}`;
    const response = axios.get(url, data , config);
    console.log(response);

}