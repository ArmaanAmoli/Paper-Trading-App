from fastapi import  WebSocket , FastAPI , WebSocketDisconnect
import asyncio
from currency import update_rates_every_24h , get_currency
from contextlib import asynccontextmanager
import yfinance as yf
import currency
from data import get_quote
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

async def fetch_and_broadcast(ticker:str):
    while True:
        payload = await get_quote(ticker)
        dead = [] # Stores disconnected nodes
        for ws in ticker_subscribers[ticker]:
            try:
                await ws.send_json(payload)
            except:
                dead.append(ws)
        for ws in dead:
            ticker_subscribers[ticker].remove(ws)
        await asyncio.sleep(2)

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
            
            if not ticker:
                continue
            
            if action == "subscribe":
                subscribed.add(ticker)
                ticker_subscribers[ticker].append(websocket)
                start_fetcher(ticker)
                # Here websocket is the user
            elif action == "unsubscribe":
                subscribed.discard(ticker)
                ticker_subscribers[ticker].remove(websocket)
                stop_fetcher(ticker)
                
    except WebSocketDisconnect:
        for subs in ticker_subscribers.values():
            if websocket in subs:
                subs.remove(websocket)
            
    except WebSocketDisconnect:
        print(f"{ticker} client disconnected")
    finally:
        await websocket.close()
