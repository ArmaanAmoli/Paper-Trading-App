import axios from "axios";
import clickSound from '../assets/sound/position-sound.mp3'
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
    const url = `http://localhost:3000/${side}`;
    const response = axios.post(url, data , config);
    const audio = new Audio(clickSound);
    audio.play();
    console.log(response);

}