import axios from "axios";

export async function fetchData(ticker,interval,period){
    const url = 'http://localhost:3000/data';
    const response = await axios.get(url , {
        params:{
            ticker:ticker,
            period:period,
            interval:interval
        }
    });
    const data = response.data;
    
    return data;
}

export async function fetchQuote(ticker) {
    const url = 'http://localhost:3000/quote';
    const response = await axios.get(url,{
        params:{
            ticker:ticker
        }
    });
    const data = response.data;
    console.log(data);
    return data;
}