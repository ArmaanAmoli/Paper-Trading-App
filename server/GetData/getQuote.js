import axios from 'axios';
const quoteLink = process.env.FAST_API_SERVER_DOMAIN + '/quote';
export async function getQuote(ticker) {
  try {
    const fastAPIRes = await axios.get(quoteLink, {
      params: {
        ticker: ticker,
      },
    });
    return fastAPIRes.data;
  } catch (err) {
    console.error(`getQuote failed for ${ticker}:`, err.message);
    throw new Error(`Failed to fetch quote for ${ticker}: ${err.message}`);
  }
}
