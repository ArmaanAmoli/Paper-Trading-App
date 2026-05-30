import httpx
import os
import json
import asyncio
import yfinance as yf
from datetime import datetime , UTC

API_KEY = os.environ.get('EXCHANGE_RATE_API')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_PATH = os.path.join(BASE_DIR, "exchange_rates.json")

rates = {"rates": {"USD": 1}}
async def fetch_rates():
    global rates
    url = f"https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    if response.status_code == 200:
        data = response.json()
        rates = {
            "last_updated":datetime.now(UTC).isoformat(),
            "rates":data["conversion_rates"]
        }
        with open(FILE_PATH , "w") as f:
            json.dump(rates,f)
        print("Exchange rate updated")
    else:
        print("Failed to fetch rates")


async def update_rates_every_24h():
    await fetch_rates()
    while True:
        await asyncio.sleep(86400)
        await fetch_rates()

_currency_cache = {}
async def get_currency(ticker):
    if ticker not in _currency_cache:
        try:
            t = yf.Ticker(ticker)
            info = await asyncio.to_thread(lambda: t.fast_info)
            _currency_cache[ticker] = info.get("currency", "USD")
        except:
            _currency_cache[ticker] = "USD"
    return _currency_cache[ticker]
        

'''
{
    "result": "success",
    "documentation": "https://www.exchangerate-api.com/docs",
    "terms_of_use": "https://www.exchangerate-api.com/terms",
    "time_last_update_unix": 1585267200,
    "time_last_update_utc": "Fri, 27 Mar 2020 00:00:00 +0000",
    "time_next_update_unix": 1585353700,
    "time_next_update_utc": "Sat, 28 Mar 2020 00:00:00 +0000",
    "base_code": "USD",
    "conversion_rates": {
        "USD": 1,
        "AUD": 1.4817,
        "BGN": 1.7741,
        "CAD": 1.3168,
        "CHF": 0.9774,
        "CNY": 6.9454,
        "EGP": 15.7361,
        "EUR": 0.9013,
        "GBP": 0.7679,
        "...": 7.8536,
        "...": 1.3127,
        "...": 7.4722, etc. etc.
    }
}
'''