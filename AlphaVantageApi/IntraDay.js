import process from 'node:process';

export async function IntraDayRequest(symbol, interval) {
    const apikey = process.env.ALPHA_API_KEY;
    let url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${apikey}`;

    const response = await fetch(url,
        {
            headers: { 'User-Agent': 'node' }
        }
    );
    if(!response.ok){
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}