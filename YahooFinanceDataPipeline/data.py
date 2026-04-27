from fastapi import HTTPException
import asyncio
from currency import get_currency
import currency
import yfinance as yf
import talib
import numpy as np
import pandas as pd
import datetime
from talib import MA_Type

async def last_candle(ticker , interval):
    period = "1d"
    tick = yf.Ticker(ticker)
    raw = await asyncio.to_thread(lambda: tick.history(period , interval))
    output = raw.iloc[-1 , :-3].to_dict()
    return output

async def get_quote(ticker):
     # LOGIC
    stock = yf.Ticker(ticker)
    # info =stock.info
    info = await asyncio.to_thread(lambda: stock.info)
    
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
    
    curr = (await get_currency(ticker)).strip().upper()
    rate = currency.rates["rates"].get(curr, 1)

    current_price = current_price/rate
    change = change / rate
    response = {
        "currentPrice":round(current_price,2),
        "change":round(change,3),
        "percentChange":round(per_change,3)
    }
    print(response)
    return response


def format_data(df):
    df.reset_index(inplace=True)
    df.rename(columns={df.columns[0]: "Date"}, inplace=True)
    df['Date'] = df['Date'].apply(lambda x: x.isoformat())
    # df.columns = df.columns.droplevel(1)
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

#Relative Strength Index
def RSI_(df , timeperiod=14):
    try:
        data = df['Close'].to_numpy()
        
        time = df['Date'][timeperiod:].to_numpy()
        data_reshaped = data.reshape(1,len(data))[0]
        data_reshaped = talib.RSI(data_reshaped, timeperiod=timeperiod)[timeperiod:]
        final_df = pd.DataFrame({'Date':time , 'RSI':data_reshaped})
        final_dict = final_df.to_dict(orient="records")
        print(len(final_dict))
        return final_dict
    except Exception as e:
        print("Problem occured in RSI_",e)
        raise HTTPException(status_code=500 , detail=str(e))
    
def BBAND_(df , timeperiod=20 , stdUp=2 , stdDown=2 , matype=0):
    try:
        data = df['Close'].to_numpy()
        time = df['Date'][timeperiod:].to_numpy()
        data_reshaped = data.reshape(1,len(data))[0]
        
        band_up , band_middle , band_down = talib.BBANDS(data_reshaped, timeperiod=timeperiod , nbdevdn=stdDown , nbdevup=stdUp , matype=matype)
        
        band_up_dict = pd.DataFrame({'Date':time , 'BBAND_UP':band_up[timeperiod:]}).to_dict(orient='records')
        band_middle_dict = pd.DataFrame({'Date':time , 'BBAND_MIDDLE':band_middle[timeperiod:]}).to_dict(orient='records')
        band_down_dict = pd.DataFrame({'Date':time , 'BBAND_DOWN':band_down[timeperiod:]}).to_dict(orient='records')
        
        final_dict = {
            "UP": band_up_dict,
            "MIDDLE": band_middle_dict,
            "DOWN": band_down_dict
        }
        
        print(len(final_dict))
        return final_dict
    
    
    except Exception as e:
        print("Problem occured in BBAND_",e)
        raise HTTPException(status_code=500 , detail=str(e))
    
def VOL_(df):
    try:
        data = df[['Date','Volume']]
        final_dict = data.to_dict(orient="records")
        print(len(final_dict))
        return final_dict
    except Exception as e:
        print("Problem occured in VOL_",e)
        raise HTTPException(status_code=500 , detail=str(e))
    
def OBV_(df):
    try:
        date = df['Date']
        
        close = df['Close'].to_numpy().reshape(-1,len(df))[0].astype(np.float64)
        volume = df['Volume'].to_numpy().reshape(-1,len(df))[0].astype(np.float64)
        
        obv = talib.OBV(close , volume)
        final_df = pd.DataFrame({'Date':date , 'OBV':obv})
        
        final_dict = final_df.to_dict(orient="records")
        print(len(final_dict))
        return final_dict
    except Exception as e:
        print("Problem occured in OBV_",e)
        raise HTTPException(status_code=500 , detail=str(e))

# fastk_period: int= 5, 
# slowk_period: int= 3, 
# slowk_matype: MA_Type = MA_Type.SMA, 
# slowd_period: int= 3, 
# slowd_matype: MA_Type = MA_Type.SMA
def STOCH_(df , fastk_period: int= 5 , slowk_period: int= 3 ,
           slowk_matype = 0 , slowd_period: int= 3, slowd_matype=0):
    try:
        close = df['Close'].to_numpy().reshape(-1,len(df))[0].astype(np.float64)
        high = df['High'].to_numpy().reshape(-1,len(df))[0].astype(np.float64)
        low = df['Low'].to_numpy().reshape(-1,len(df))[0].astype(np.float64)
        date = df['Date']
        
        stoch = talib.STOCH(high=high , low=low , close=close , fastk_period=fastk_period 
                            ,slowk_period=slowk_period , slowk_matype = slowk_matype, slowd_period=slowd_period ,
                            slowd_matype=slowd_matype)
        
        stoch = np.nan_to_num(stoch  , nan=0.0)
        slowk, slowd = stoch
        
        final_df_slowk = pd.DataFrame({'Date':date , 'SLOWK':slowk})
        final_df_slowd = pd.DataFrame({'Date':date , 'SLOWD':slowd})
        
        final_dict_slowk = final_df_slowk.to_dict(orient="records")
        final_dict_slowd = final_df_slowd.to_dict(orient="records")
        
        final_dict = {
            "SLOWK": final_dict_slowk,
            "SLOWD": final_dict_slowd
        }
        
        print(len(final_dict))
        return final_dict
    except Exception as e:
        print("Problem occured in OBV_",e)
        raise HTTPException(status_code=500 , detail=str(e))