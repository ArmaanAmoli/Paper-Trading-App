from fastapi import FastAPI , Query , HTTPException
from typing import Annotated, List
import pandas as pd
import yfinance as yf
import uvicorn

app = FastAPI()

@app.get("/data/")
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

if __name__ =="__main__":
    print("Server Running in http://127.0.0.1:8000")
    uvicorn.run("server:app", host = "127.0.0.1" , port=8000, reload=True)