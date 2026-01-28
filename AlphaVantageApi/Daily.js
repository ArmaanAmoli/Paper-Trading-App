import process from 'node:process';

export async function Daily(symbol) {
    const apikey = process.env.ALPHA_API_KEY;

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apikey}`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'node'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}
