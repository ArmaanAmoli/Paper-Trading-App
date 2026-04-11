from fastapi import HTTPException
import asyncio
from currency import get_currency
import currency
import yfinance as yf
import talib
import numpy as np
import pandas as pd
import datetime

def format_data(df):
    df.reset_index(inplace=True)
    df.rename(columns={df.columns[0]: "Date"}, inplace=True)
    df['Date'] = df['Date'].apply(lambda x: x.isoformat())
    
    return df

async def collect_data(ticker , interval , period):
    stock = yf.Ticker(ticker)
    df = await asyncio.to_thread(stock.history, period = period , interval = interval)
    
    #currency conversion
    price_columns = ["Open" , "High" , "Low" , "Close"]
    curr = (await get_currency(ticker)).strip().upper()
    rate = currency.rates["rates"].get(curr, 1)
    df[price_columns] = df[price_columns]/rate
    
    return df


async def get_data(ticker , interval , period):
    try:
        stock = yf.Ticker(ticker)
        df = await collect_data(ticker , interval , period)
    
        if df.empty:
            raise HTTPException(status_code=404, detail = f"No data found for ticker: {ticker} with specified period and interval.")

        df = format_data(df)
        '''
        #currency conversion
        price_columns = ["Open" , "High" , "Low" , "Close"]
        curr = (await get_currency(ticker)).strip().upper()
        
        # print("Ticker:", ticker, "Currency:", curr)
        # print("Rate:", currency.rates["rates"].get(curr))
        
        rate = currency.rates["rates"].get(curr, 1)
        df[price_columns] = df[price_columns]/rate
        '''
        
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500 , detail = str(e))


#Exponential Moving Average
def EMA_(df , timeperiod=10):
    try:
        data = df['Close'].to_numpy()
        time = df['Date'][timeperiod-1:].to_numpy()
        data_reshaped = data.reshape(1,len(data))[0]
        data_reshaped = talib.EMA(data_reshaped, timeperiod=timeperiod)[timeperiod-1:]
        final_df = pd.DataFrame({'Date':time , 'EMA':data_reshaped})
        final_dict = final_df.to_dict(orient="records")
        print(len(final_dict))
        return final_dict
    except Exception as e:
        print("Problem occured in SMA_",e)
        raise HTTPException(status_code=500 , detail=str(e))
    
#Simple Moving Average
def SMA_(df , timeperiod=10):
    try:
        data = df['Close'].to_numpy()
        
        time = df['Date'][timeperiod-1:].to_numpy()
        data_reshaped = data.reshape(1,len(data))[0]
        data_reshaped = talib.SMA(data_reshaped, timeperiod=timeperiod)[timeperiod-1:]
        final_df = pd.DataFrame({'Date':time , 'SMA':data_reshaped})
        final_dict = final_df.to_dict(orient="records")
        print(len(final_dict))
        return final_dict
    except Exception as e:
        print("Problem occured in SMA_",e)
        raise HTTPException(status_code=500 , detail=str(e))