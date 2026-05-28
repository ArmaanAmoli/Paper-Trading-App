import indicesData from './world_indices_yahoo.json' with {type: 'json'};
import { getQuote } from '../getQuote';


async function getDailyMarketData() {
    const indicesPerformanceData = {}
    const promiseArrayIndices = [];

    for (const continent of indicesData) {
        for (const country of continent) {
            for (indices of country) {
                const promise = getQuote(indices);
                promiseArrayIndices.push(promise);
            }
        }
    }

    try {
        const values = await Promise.allSettled(promiseArrayIndices);
        return values; 
    } catch (error) {
        console.error("An error occurred in getDailyMarketData:", error);
        return [];
    }
}




