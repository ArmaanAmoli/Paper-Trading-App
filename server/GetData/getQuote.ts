import axios from 'axios';
import { getEnv } from '../lib/env.js';
import type { QuoteResponse } from '../lib/pythonClient.js';

const env = getEnv();
const quoteLink = env.FAST_API_SERVER_DOMAIN + '/quote';

export async function getQuote(ticker: string): Promise<QuoteResponse> {
  try {
    const fastAPIRes = await axios.get<QuoteResponse>(quoteLink, {
      params: { ticker },
    });
    return fastAPIRes.data;
  } catch (err) {
    console.error(`getQuote failed for ${ticker}:`, err);
    throw new Error(`Failed to fetch quote for ${ticker}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
