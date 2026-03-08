/*
    Future Improvement : shift this to python yahoo finance;
*/


import process from "node:process";
import axios from "axios";

export async function convertToUSD() {
    const base_url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API}/latest/USD`;
    try {
        const amount = await axios.get(base_url);
        if (amount.conversion_rates) {
            return Number(amount.conversion_rates);
        }
    } catch (err) {
        throw new Error(err);
    }
}

export async function getCurrency(ticker) {
    let fastAPIRes = null;
    let data = null;
    try {
        let fastAPIRes = await axios.get(
            'http://127.0.0.1:8000/getCurrency',
            {
                params: {
                    ticker: ticker
                }
            }
        );

        data = await fastAPIRes.json();

    }
    catch(err){
        throw new Error(err);
    }
    
    if (fastAPIRes.ok) {
        console.log(fastAPIRes); // to be removed
        console.log(data) // to be removed
        return data;
    }

    else{
        throw new Error(`error from Yahoo finance currency route: ${fastAPIRes.status}`);
    }
}