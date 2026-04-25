from fastapi import FastAPI , Query , HTTPException ,WebSocket , WebSocketDisconnect
from fastapi.responses import FileResponse
from typing import Annotated, List
import pandas as pd
import yfinance as yf
import uvicorn
import currency
from currency import update_rates_every_24h , get_currency
import asyncio
from contextlib import asynccontextmanager
from data import get_data,EMA_,SMA_,collect_data,format_data,VOL_,OBV_,RSI_,BBAND_,STOCH_ , get_quote
import talib
from collections import defaultdict


@asynccontextmanager
async def lifespan(app:FastAPI):
    print("Server starting")
    task = asyncio.create_task(update_rates_every_24h())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    print("Server stopping")


app = FastAPI(lifespan=lifespan)

@app.get("/indicators/EMA")
async def EMA_endpoint(
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")],
    timeperiod: int
):
    try:
        data = await collect_data(ticker=ticker , interval=interval , period=period)
        data_df = format_data(data)
        final_data = EMA_(data_df,timeperiod=timeperiod)
        return final_data
    except Exception as e:
        print("Their was an error in the EMA data endpoint" , e)

@app.get("/indicators/SMA")
async def SMA_endpoint(
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")],
    timeperiod: int
):
    try:
        data = await collect_data(ticker=ticker , interval=interval , period=period)
        data_df = format_data(data)
        final_data = SMA_(data_df,timeperiod=timeperiod)
        return final_data
    except Exception as e:
        print("Their was an error in the SMA data endpoint" , e)
        
@app.get("/indicators/RSI")
async def RSI_endpoint(
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")],
    timeperiod: int
):
    try:
        data = await collect_data(ticker=ticker , interval=interval , period=period)
        data_df = format_data(data)
        final_data = RSI_(data_df,timeperiod=timeperiod)
        return final_data
    except Exception as e:
        print("Their was an error in the RSI data endpoint" , e)
        
@app.get("/indicators/VOL")
async def VOL_endpoint(
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")],
):
    try:
        data = await collect_data(ticker=ticker , interval=interval , period=period)
        data_df = format_data(data)
        final_data = VOL_(data_df)
        return final_data
    except Exception as e:
        print("Their was an error in the VOL data endpoint" , e)

@app.get("/indicators/OBV")
async def OBV_endpoint(
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")],
):
    try:
        data = await collect_data(ticker=ticker , interval=interval , period=period)
        data_df = format_data(data)
        final_data = OBV_(data_df)
        return final_data
    except Exception as e:
        print("Their was an error in the OBV data endpoint" , e)

@app.get("/indicators/BBAND")
async def BBAND_endpoint(
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")],
    matype:bool,
    timeperiod: int,
    stdUp:int,
    stdDown:int
):
    try:
        data = await collect_data(ticker=ticker , interval=interval , period=period)
        data_df = format_data(data)
        final_data = BBAND_(df = data_df,timeperiod=timeperiod , matype=matype , stdDown=stdDown , stdUp=stdUp)
        return final_data
    except Exception as e:
        print("Their was an error in the BBAND data endpoint" , e)
    
@app.get("/indicators/STOCH")
async def STOCH_endpoint(
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")],
    fastk_period: int= 5, 
    slowk_period: int= 3, 
    slowk_matype: int= 0, 
    slowd_period: int= 3, 
    slowd_matype: int= 0
):
    try:
        data = await collect_data(ticker=ticker , interval=interval , period=period)
        data_df = format_data(data)
        final_data = STOCH_(df=data_df , fastk_period = fastk_period , slowk_period = slowk_period ,
           slowk_matype = slowk_matype , slowd_period = slowd_period, slowd_matype=slowd_matype)
        return final_data
    
    except Exception as e:
        print("Their was an error in STOCH data endpoint " , e)

@app.get("/data")
async def get_hourly_data(
    
    ticker: str,
    period: Annotated[str, Query(..., description="e.g., '1d', '5d', '1mo', '3mo', '1y', 'max'")],
    interval: Annotated[str, Query(..., description="e.g., '1m', '5m', '1d', '1wk', '1mo'")]):
    try:
        data = await get_data(ticker=ticker , period=period , interval=interval)
        return data
    except Exception as e:
        print("Their was an error in the get_hourly_data fucntion" , e)

@app.get("/search")
async def get_search_results(query: str):
    try:
        results = await asyncio.to_thread(yf.Search , query=query)
        if results.quotes is not None:
            # print(results.quotes)
            return results.quotes
        else:
            raise HTTPException(status_code=404 , detail="No results found")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500 , detail=str(e))

@app.get("/quote")
async def get_quote(ticker: str):
    try:
        
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
        
        #TESTING
        
        # print("Ticker:", ticker, "Currency:", curr)
        # print("Rate:", currency.rates["rates"].get(curr))
        # print(currency.rates["rates"].keys())
        
        
        
        rate = currency.rates["rates"].get(curr, 1)
        
        current_price = current_price/rate
        change = change / rate
        response = {
            "currentPrice":round(current_price,2),
            "change":round(change,3),
            "percentChange":round(per_change,3)
        }
        return response
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=500 , detail = str(e))



# #WEB SOCKETS
# ticker_subscribers:dict[str , list[WebSocket]] = defaultdict(list)
# fetcher_tasks: dict[str, asyncio.Task] = {} # stores all the fetch_broadcast() running for different tickers

# async def fetch_and_broadcast(ticker:str):
#     while True:
#         payload = await get_quote(ticker)
#         dead = [] # Stores disconnected nodes
#         for ws in ticker_subscribers[ticker]:
#             try:
#                 await ws.send_json(payload)
#             except:
#                 dead.append(ws)
#         for ws in dead:
#             ticker_subscribers[ticker].remove(ws)
#         await asyncio.sleep(2)

# def start_fetcher(ticker:str):
#     if ticker not in fetcher_tasks:
#         task = asyncio.create_task(fetch_and_broadcast(ticker))
#         fetcher_tasks[ticker] = task
        
# def stop_fetcher(ticker:str):
#     if not ticker_subscribers[ticker]: #Only pop if no subscribers left
#         task = fetcher_tasks.pop(ticker , None)
#         if task:
#             task.cancel()
#             print(f"[{ticker}] fetcher stopped")
        

# @app.websocket("/ws/quote")
# async def quote_ws(websocket: WebSocket): # This endpoint just maintains the ticker_subscriber dictionary
#     subscribed:set[str] = set() # each user have their own subscribed set
#     await websocket.accept() # Initial Handshake request by client
#     try:
#         while True:
#             # msg-example: {action:"subscribe" or "unsubscribe" , ticker: "AAPL"}
#             msg = await websocket.receive_json()
#             action = msg.get("action")
#             ticker = msg.get("ticker" , "").upper()
            
#             if not ticker:
#                 continue
            
#             if action == "subscribe":
#                 subscribed.add(ticker)
#                 ticker_subscribers[ticker].append(websocket)
#                 start_fetcher(ticker)
#                 # Here websocket is the user
#             elif action == "unsubscribe":
#                 subscribed.discard(ticker)
#                 ticker_subscribers[ticker].remove(websocket)
#                 stop_fetcher(ticker)
                
#     except WebSocketDisconnect:
#         for subs in ticker_subscribers.values():
#             if websocket in subs:
#                 subs.remove(websocket)
            
#     except WebSocketDisconnect:
#         print(f"{ticker} client disconnected")
#     finally:
#         await websocket.close()


if __name__ =="__main__":
    print("Server Running in http://127.0.0.1:8000")
    uvicorn.run("server:app", host = "127.0.0.1" , port=8000, reload=True)