import { request } from "request";
import process from 'node:process';

export async function DailyAjusted(symbol) {
    const apikey = process.env.MY_API_KEY;
    let url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${apikey}`;

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