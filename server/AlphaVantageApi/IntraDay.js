import { request } from "request";
import process from 'node:process';

export async function IntraDayRequest(symbol, interval) {
    const apikey = process.env.ALPHA_API_KEY;
    let url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${apikey}`;

    return new Promise((resolve, reject) => {
        request.get(
            {
                url: url,
                json: true,
                headers: { 'User-Agent': 'request' }
            },
            (err, res, data) => {
                if (err) {
                    reject('Error: ' + err);
                } else if (res.statusCode !== 200) {
                    reject('Status: ' + res.statusCode);
                }
                else {
                    resolve(data);
                }
            });
    })

}