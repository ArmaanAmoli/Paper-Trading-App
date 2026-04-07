import axios from "axios";
const token = localStorage.getItem('token');
export async function fetchData(ticker, interval, period) {
    const url = 'http://localhost:3000/data';
    
    const response = await axios.get(url, {
        params: {
            ticker: ticker,
            period: period,
            interval: interval
        },
        headers: {
            'authorization': `Bearer ${token}`
        }

    });
    const data = response.data;

    return data;
}

export async function fetchQuote(ticker) {
    const url = 'http://localhost:3000/quote';
    const response = await axios.get(url, {
        params: {
            ticker: ticker
        },
        headers: {
            'authorization': `Bearer ${token}`
        }
    });
    const data = response.data;
    console.log(data);
    return data;
}

export async function fetchIndicatorData(properties){
    const url = 'http://localhost:3000/data/indicator';
    const response = await axios.get(url ,
        {
            params:properties,
            headers:{
                'authorization':`Bearer ${token}`
            }
        }
    );
    const data = response.data;
    console.log("Fetching Indicator data: ",data);
    return data;
}