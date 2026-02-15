import axios from "axios";
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