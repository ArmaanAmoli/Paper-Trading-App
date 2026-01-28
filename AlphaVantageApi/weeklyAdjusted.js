// import process from 'node:process';

export async function weeklyAjusted(symbol) {
    const apikey = import.meta.env.VITE_ALPHA_API_KEY;

    let url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${symbol}&outputsize=compact&apikey=${apikey}`;

    const response = await fetch(url, {
        headers:{
            'User-Agent':'node'
        }
    });
    if(!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data;
}