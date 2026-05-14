import axios from "axios";

async function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { authorization: `Bearer ${token}` } : {};
}

export async function fetchData(ticker, interval, period) {
    const url = 'http://localhost:3000/data';
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(url, {
            params: { ticker, period, interval },
            headers,
        });
        const data = response.data;
        console.log("Data: ", data);
        return data;
    } catch (err) {
        console.warn("fetchData failed", err);
        return [];
    }
}

export async function fetchQuote(ticker) {
    const url = 'http://localhost:3000/quote';
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(url, {
            params: { ticker },
            headers,
        });
        const data = response.data;
        console.log(data);
        return data;
    } catch (err) {
        console.warn("fetchQuote failed", err);
        return { currentPrice: 0 };
    }
}

export async function fetchIndicatorData(properties) {
    const url = 'http://localhost:3000/data/indicator';
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(url, {
            params: properties,
            headers,
        });
        const data = response.data;
        console.log("Fetching Indicator data: ", data);
        return data;
    } catch (err) {
        console.warn("fetchIndicatorData failed", err);
        return {};
    }
}