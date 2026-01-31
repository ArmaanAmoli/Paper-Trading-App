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
    console.log(data); //// TO BE REMOVED LATER
    return data;
}