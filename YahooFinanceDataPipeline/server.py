from fastapi import FastAPI , Query , HTTPException
from typing import Annotated, List
import pandas as pd
import yfinance as yf
import uvicorn

app = FastAPI()

@app.get("/data")
async def get_hourly_data(
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")]):
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period, interval= interval)
        if df.empty:
            raise HTTPException(status_code=404, detail = f"No data found for ticker: {ticker} with specified period and interval.")
        df.reset_index(inplace=True)
        df.rename(columns={df.columns[0]: "Date"}, inplace=True)
        df['Date'] = df['Date'].apply(lambda x: x.isoformat()) 
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500 , detail = str(e))


@app.get("/quote")
async def get_quote(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        info =stock.info
        if info is None or 'currentPrice' not in info:
            hist = stock.history(period="1d" , interval = "1m")
            if(hist.empty):
                raise ValueError("No price data found for the ticker.")
            current_price = stock.fast_info['last_price']
            prev_close = stock.fast_info['previous_close']
        else:  
            current_price = info.get('currentPrice')
            prev_close = info.get('previousClose')
        change = current_price - prev_close
        per_change = (change/prev_close)*100
        response = {
            "currentPrice":round(current_price,2),
            "change":round(change,3),
            "percentChange":round(per_change,3)
        }
        return response
    except Exception as e:
        raise HTTPException(status_code=500 , detail = str(e))

if __name__ =="__main__":
    print("Server Running in http://127.0.0.1:8000")
    uvicorn.run("server:app", host = "127.0.0.1" , port=8000, reload=True)