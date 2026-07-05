import axios from "axios";
const quoteLink = process.env.FAST_API_SERVER_DOMAIN + '/quote'
export async function getQuote(ticker) {
    try{
        const fastAPIRes = await axios.get('http://127.0.0.1:8000/quote',{
            params:{
                ticker:ticker
            }
        });
        return(fastAPIRes.data);
    }catch(err){return err};
}