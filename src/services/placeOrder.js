import axios from "axios";
import clickSound from '../assets/sound/position-sound.mp3'
export async function placeOrder(ticker, Qty, side , stopLossOrder) {
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
    const responseOfTradeExecution = await axios.post(url, data , config);
    let responseOfStopLossPlacement = {}
    if(stopLossOrder != null && stopLossOrder.qty != 0 && stopLossOrder.price != 0){
        responseOfStopLossPlacement = await axios.post("http://localhost:3000/stopLoss" , stopLossOrder , config);
    }
    const audio = new Audio(clickSound);
    audio.play();
    
    return {trade:responseOfTradeExecution.data ?? null , stopLoss: responseOfStopLossPlacement.data ?? null};

}