import process from "node:process";
import axios from "axios";
export async function convertToUSD(amount , symbol){
    const base_url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API}/${symbol}/USD/${amount}`;
    try{
        const amount = await axios.get(base_url);
        if(amount.conversion_result) return Number(amount.conversion_result);
    }catch(err){
        throw new Error(err);
    }
    
}