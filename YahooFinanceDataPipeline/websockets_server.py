from fastapi import  WebSocket , FastAPI , WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from currency import update_rates_every_24h , get_currency
from contextlib import asynccontextmanager
import yfinance as yf
import currency
import uvicorn
from data import get_quote , last_candle , last_value
from collections import defaultdict

'''
This is an under development websocket server whose purpose
is to reduce constant http polling.
'''

ticker_subscribers:dict[str , list[WebSocket]] = defaultdict(list)
fetcher_tasks: dict[str, asyncio.Task] = {} # stores all the fetch_broadcast() running for different tickers

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
app.add_middleware(CORSMiddleware)

async def fetch_and_broadcast(ticker:str):
    while True:
        payload = await get_quote(ticker)
        payload["ticker"] = ticker
        dead = [] # Stores disconnected nodes
        for ws in ticker_subscribers[ticker]:
            try:
                print(payload)
                await ws.send_json(payload)
            except Exception as e:
                dead.append(ws)
                print("Error in Fetch_broadcast: " , e)
        for ws in dead:
            ticker_subscribers[ticker].remove(ws)
        await asyncio.sleep(6)

def start_fetcher(ticker:str):
    if ticker not in fetcher_tasks:
        task = asyncio.create_task(fetch_and_broadcast(ticker))
        fetcher_tasks[ticker] = task
        
def stop_fetcher(ticker:str):
    if not ticker_subscribers[ticker]: #Only pop if no subscribers left
        task = fetcher_tasks.pop(ticker , None)
        if task:
            task.cancel()
            print(f"[{ticker}] fetcher stopped")
        

@app.websocket("/ws/quote")
async def quote_ws(websocket: WebSocket): # This endpoint just maintains the ticker_subscriber dictionary
    subscribed:set[str] = set() # each user have their own subscribed set
    await websocket.accept() # Initial Handshake request by client
    try:
        while True:
            # msg-example: {action:"subscribe" or "unsubscribe" , ticker: "AAPL"}
            msg = await websocket.receive_json()
            action = msg.get("action")
            ticker = msg.get("ticker" , "").upper()
            if(ticker == "" or ticker is None):continue
            
            if action == "subscribe":
                subscribed.add(ticker)
                ticker_subscribers[ticker].append(websocket)
                start_fetcher(ticker)
                # Here websocket is the user
            elif action == "unsubscribe":
                if ticker in subscribed: 
                    subscribed.discard(ticker)
                if(ticker in ticker_subscribers.keys() and websocket in ticker_subscribers[ticker]):
                    ticker_subscribers[ticker].remove(websocket)
                    stop_fetcher(ticker)
                
    except WebSocketDisconnect:
        for ticks in ticker_subscribers.keys():
            subs = ticker_subscribers[ticks]
            if websocket in subs:
                subs.remove(websocket)
                stop_fetcher(ticks)
        print(f"Client disconnected {websocket}")
        
    finally:
        await websocket.close()
        # print("ws/quote")
        
# dict -> ticker -> indicators -> property -> [ws ...]

'''
candles_subscribers:dict[str , dict[str , dict[str , list[WebSocket]]]] = defaultdict(list)
candles_fetcher_tasks:dict[str , dict[str , dict[str , asyncio.Task]]] = defaultdict(list)

async def listen_for_candles(ticker:str , interval:str , indicator:str, properties:dict):
    while True:
        data = await last_value(ticker=ticker , interval=interval , indicator=indicator ,properties=properties)
        data["ticker"] = ticker
        indicator_name = ticker + "::" + interval + "::" + indicator + "::" + str(properties)
        for ws in candles_subscribers[ticker][indicator][indicator_name]:
            try:
                await ws.send_json(data)
            except Exception as e:
                print(f"Error occured while fetching candle {ticker}")
        await asyncio.sleep(6)

def start_listen_for_candles(ticker:str , interval):
    if(len(candles_subscribers[ticker][interval]) is not False):return
    task = asyncio.create_task(listen_for_candles(ticker , interval))
    fetcher_tasks[ticker][interval] = task

def stop_listen_for_candles(ticker:str , interval):
    if(ticker not in candles_fetcher_tasks.keys()):return
    if(interval not in candles_fetcher_tasks[ticker].keys()):return
    task = candles_fetcher_tasks[ticker][interval]
    if task:
        task.cancel()
        print(f"candle fetcher task for {ticker}-{interval}")

def isSubscribed(websocket , ticker , interval):
    return websocket in candles_subscribers[ticker][interval]

@app.websocket("ws/indicator")
async def candles_ws(websocket: WebSocket):
    await websocket.accept()
    subscribed = set[str] = set()
    while True:
        #{ticker: , interval: , action:subscribe/unsubscribe}
        msg = await websocket.receive_json()
        action = msg.get("action")
        ticker = msg.get("ticker")
        interval = msg.get("interval")
        
        if(not (ticker and action and interval) ):
            websocket.send_text("incomplete payload")
        
        if(action == "subscribe"):
            if(isSubscribed(websocket , ticker , interval)):
                websocket.send_text(f"Already subscribed to {ticker} for the interval {interval}")
            else:
                candles_subscribers[ticker][interval].append(websocket)
                start_listen_for_candles(ticker , interval)
                websocket.send_text(f"subscribed ticker: {ticker} , interval: {interval}")
        elif(action == "unsubscribe"):
            if( not isSubscribed(websocket , ticker , interval)):
                websocket.send_text(f"Already not in subscription {ticker} for the interval {interval}")
            else:
                candles_subscribers[ticker][interval].remove(websocket)
                if(len(candles_subscribers[ticker][interval]) is False):
                    stop_listen_for_candles(ticker , interval)
                websocket.send_text(f"unsubscribed ticker: {ticker} , interval: {interval}")
        else:
            websocket.send_text("invalid request")
'''


if __name__ =="__main__":
    print("Server Running in ws://127.0.0.1:8001")
    uvicorn.run("websockets_server:app", host = "127.0.0.1" , port=8001, reload=True)