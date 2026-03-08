import yfinance as yf
import os
import requests
import json
import asyncio

async def get_current_rates():
    try:
        api_key = os.environ['EXCHANGE_RATE_API']
        print(f"API Key: {api_key}")
    except KeyError:
        print("Error: Required environment variable 'API_KEY' not set.")

    url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/USD"

    response = await requests.get(url)

    if response.status_code in range(200,300):
        data = response.json() # data is a python dict
        print(data) # to be removed
        data = data['conversion_rates']
        return data
    
    return False


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