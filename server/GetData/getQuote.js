import axios from "axios";
const quoteLink = process.env.FAST_API_SERVER_DOMAIN + '/quote'
export async function getQuote(ticker) {
    try{
        const fastAPIRes = await axios.get(quoteLink,{
            params:{
                ticker:ticker
            }
        });
        return(fastAPIRes.data);
    }catch(err){return err};
}