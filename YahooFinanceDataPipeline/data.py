from fastapi import HTTPException
import asyncio
from currency import get_currency
import currency
import yfinance as yf
import talib
import numpy as np
async def get_data(ticker , interval , period):
    try:
        stock = yf.Ticker(ticker)
        
        # df = stock.history(period=period, interval= interval)
        df = await asyncio.to_thread(stock.history, period = period , interval = interval)
    
        if df.empty:
            raise HTTPException(status_code=404, detail = f"No data found for ticker: {ticker} with specified period and interval.")
        
        df.reset_index(inplace=True)
        df.rename(columns={df.columns[0]: "Date"}, inplace=True)
        df['Date'] = df['Date'].apply(lambda x: x.isoformat()) 
        
        #currency conversion
        price_columns = ["Open" , "High" , "Low" , "Close"]
        curr = (await get_currency(ticker)).strip().upper()
        
        # print("Ticker:", ticker, "Currency:", curr)
        # print("Rate:", currency.rates["rates"].get(curr))
        
        rate = currency.rates["rates"].get(curr, 1)
        df[price_columns] = df[price_columns]/rate
        
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500 , detail = str(e))


#Exponential Moving Average
def EMA_(df , timeperiod=10):
    try:
        data = df['Close'].to_numpy()
        data_reshaped = data.reshape(1,len(data))[0]
        return talib.EMA(data_reshaped, timeperiod=timeperiod)[timeperiod-1:].tolist() # period-1
    except Exception as e:
        print("Problem occured in EMA_",e)
        raise HTTPException(status_code=500 , detail=str(e))
    
#Simple Moving Average
def SMA_(df , timeperiod=10):
    try:
        data = df['Close'].to_numpy()
        data_reshaped = data.reshape(1,len(data))[0]
        return talib.SMA(data_reshaped, timeperiod=timeperiod)[timeperiod-1:].tolist() # period-1
    except Exception as e:
        print("Problem occured in SMA_",e)
        raise HTTPException(status_code=500 , detail=str(e))