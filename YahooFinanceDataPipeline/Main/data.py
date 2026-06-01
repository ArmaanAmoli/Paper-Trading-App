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
import time

tickerCache = {}

def _normalize_history_period(interval: str, timeperiod: int) -> str:
    """Convert an interval/timeperiod request into a Yahoo Finance period."""
    interval = str(interval)
    timeperiod = max(1, int(timeperiod))

    if interval.endswith("m"):
        amount = int(interval[:-1] or 1)
        lookback_days = int(np.ceil(((timeperiod + 1) * amount * 3) / (60 * 24)))
    elif interval.endswith("h"):
        amount = int(interval[:-1] or 1)
        lookback_days = int(np.ceil(((timeperiod + 1) * amount * 3) / 24))
    elif interval.endswith("d"):
        amount = int(interval[:-1] or 1)
        lookback_days = (timeperiod + 1) * amount * 3
    elif interval.endswith("wk"):
        amount = int(interval[:-2] or 1)
        lookback_days = (timeperiod + 1) * amount * 7 * 3
    else:
        lookback_days = (timeperiod + 1) * 3

    buckets = [
        (1, "1d"),
        (5, "5d"),
        (30, "1mo"),
        (90, "3mo"),
        (180, "6mo"),
        (365, "1y"),
        (730, "2y"),
        (1825, "5y"),
        (3650, "10y"),
    ]
    for max_days, period in buckets:
        if lookback_days <= max_days:
            return period
    return "max"

def _serialize_for_json(data):
    """
    Convert pandas Timestamp and numpy objects to JSON-serializable types.
    Recursively handles dicts, lists, and nested structures.
    """
    if isinstance(data, dict):
        return {k: _serialize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_serialize_for_json(item) for item in data]
    elif isinstance(data, (pd.Timestamp, np.datetime64)):
        # Convert to ISO string format
        return str(pd.Timestamp(data).isoformat())
    elif isinstance(data, (np.integer, np.floating)):
        # Convert numpy types to Python native types
        return data.item()
    elif isinstance(data, np.ndarray):
        return _serialize_for_json(data.tolist())
    return data

async def last_value(ticker:str , interval:str , indicator:str , properties:dict):
    timeperiod = int(properties.get("timeperiod", 14))
    period = _normalize_history_period(interval, timeperiod)
    data = await collect_data(ticker=ticker , interval=interval , period=period)
    df = format_data(data)
    
    # Validate we have enough data
    if df is None or len(df) == 0:
        raise HTTPException(status_code=400, detail=f"No data available for {ticker} at {interval} interval")
    
    match indicator:
        case "SMA":
            result_data = SMA_(df=df , timeperiod=timeperiod)
            if not result_data or len(result_data) == 0:
                raise HTTPException(status_code=400, detail=f"SMA calculation returned no data for {ticker}")
            final_data = result_data[-1]
            return _serialize_for_json(final_data)
        case "EMA":
            result_data = EMA_(df=df , timeperiod=timeperiod)
            if not result_data or len(result_data) == 0:
                raise HTTPException(status_code=400, detail=f"EMA calculation returned no data for {ticker}")
            final_data = result_data[-1]
            return _serialize_for_json(final_data)
        case "RSI":
            result_data = RSI_(df=df , timeperiod=timeperiod)
            if not result_data or len(result_data) == 0:
                raise HTTPException(status_code=400, detail=f"RSI calculation returned no data for {ticker}")
            final_data = result_data[-1]
            return _serialize_for_json(final_data)
        case "BBAND":
            stdUp = properties["stdUp"]
            stdDown = properties["stdDown"]
            matype = properties["matype"]
            finalData = BBAND_(df , timeperiod , stdUp , stdDown , matype)
            if not finalData or not all(finalData.get(key) for key in ["UP", "MIDDLE", "DOWN"]):
                raise HTTPException(status_code=400, detail=f"BBAND calculation returned incomplete data for {ticker}")
            finalDict = {"UP":_serialize_for_json(finalData["UP"][-1]) ,
                         "MIDDLE": _serialize_for_json(finalData["MIDDLE"][-1]),
                         "DOWN":_serialize_for_json(finalData["DOWN"][-1])}
            return finalDict
        case "VOL":
            result_data = VOL_(df)
            if not result_data or len(result_data) == 0:
                raise HTTPException(status_code=400, detail=f"VOL calculation returned no data for {ticker}")
            final_data = result_data[-1]
            return _serialize_for_json(final_data)
        case "OBV":
            result_data = OBV_(df)
            if not result_data or len(result_data) == 0:
                raise HTTPException(status_code=400, detail=f"OBV calculation returned no data for {ticker}")
            final_data = result_data[-1]
            return _serialize_for_json(final_data)
        case "STOCH":
            fastk_period = properties["fastkPeriod"]
            slowk_period = properties["slowkPeriod"]
            slowk_matype = properties["slowkMaType"]
            slowd_period = properties["slowdPeriod"]
            slowd_matype = properties["slowdMaType"]
            final_data = STOCH_(df , fastk_period , slowk_period , slowk_matype,
                   slowd_period , slowd_matype)
            if not final_data or not all(final_data.get(key) for key in ["SLOWK", "SLOWD"]):
                raise HTTPException(status_code=400, detail=f"STOCH calculation returned incomplete data for {ticker}")
            finalDict = {
                "SLOWK":_serialize_for_json(final_data["SLOWK"][-1]),
                "SLOWD":_serialize_for_json(final_data["SLOWD"][-1])
            }
            return finalDict
            
        case _:
            return "unknown error"

async def last_candle(ticker , interval):
    period = "1d"
    tick = yf.Ticker(ticker)
    raw = await asyncio.to_thread(lambda: tick.history(period , interval))
    output = raw.iloc[-1 , :-3].to_dict()
    output["timestamp"] = time.time()
    return output

async def get_quote(ticker):
    curr = (await get_currency(ticker)).strip().upper()
    
    if(ticker in tickerCache):
        
        currentTime = datetime.datetime.now()
        timeDifference = currentTime - tickerCache[ticker]["time"]
        timeDifferenceInSeconds = timeDifference.total_seconds()
        if(timeDifferenceInSeconds < 15):
            return tickerCache[ticker]["quote"]
     # LOGIC
    def _fetch():
        try:
            stock = yf.Ticker(ticker)
            # info =stock.info
            fast_info = stock.fast_info
            current_price = fast_info.get('lastPrice') or fast_info.get('regularMarketPrice')
            prev_close = fast_info.get('previousClose') or fast_info.get('regularMarketPreviousClose')
            
            if current_price is None or prev_close is None:
                raise ValueError("No price data found for the ticker.")
            # else:  
            #     current_price = info.get('currentPrice')
            #     prev_close = info.get('previousClose')
                
            change = current_price - prev_close
            per_change = (change/prev_close)*100
            
            # curr = (get_currency(ticker)).strip().upper()
            rate = currency.rates["rates"].get(curr, 1)

            current_price = current_price/rate
            change = change / rate
            response = {
                "ticker":ticker,
                "currentPrice":round(current_price,2),
                "change":round(change,3),
                "percentChange":round(per_change,3)
            }
            tickerCache[ticker] = {
                "quote":response,
                "time":datetime.datetime.now()
            }
            return response
        except Exception as e:
            print("An error occured in get_quote function in data.py :\n ",e)
    
    response = await asyncio.to_thread(_fetch)
    print(response)
    return response


def format_data(df):
    if df is None or df.empty:
        return df
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
        # print(len(final_dict))
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
        # print(len(final_dict))
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
        # print(len(final_dict))
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
        
        # print(len(final_dict))
        return final_dict
    
    
    except Exception as e:
        print("Problem occured in BBAND_",e)
        raise HTTPException(status_code=500 , detail=str(e))
    
def VOL_(df):
    try:
        data = df[['Date','Volume']]
        final_dict = data.to_dict(orient="records")
        # print(len(final_dict))
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
        # print(len(final_dict))
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
        
        # print(len(final_dict))
        return final_dict
    except Exception as e:
        print("Problem occured in OBV_",e)
        raise HTTPException(status_code=500 , detail=str(e))