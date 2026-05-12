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
import json
import datetime

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
        await asyncio.sleep(10)

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
        


# INDICATOR WEBSOCKET SYSTEM - Real-time indicator updates via WebSocket

# This system pushes indicator updates to multiple connected clients without
# requiring constant HTTP polling. Uses a task-based fetcher pattern.

# Dictionary to store indicator subscribers: {indicator_id: [websocket1, websocket2, ...]}
# indicator_id format: "TICKER::INTERVAL::INDICATOR::PROPERTIES_JSON"
indicator_subscribers: dict[str, list[WebSocket]] = defaultdict(list)

# Dictionary to store active indicator fetcher tasks: {indicator_id: asyncio.Task}
# Each task continuously fetches and broadcasts updates for a specific indicator
indicator_fetcher_tasks: dict[str, asyncio.Task] = {}

# Store last calculated value to avoid sending duplicate updates
indicator_cache: dict[str, any] = {}

def generate_indicator_id(ticker: str, interval: str, indicator: str, properties: dict) -> str:
    """
    Generate unique identifier for indicator subscription.
    Combines ticker, interval, indicator type, and properties into single key.
    Example: "AAPL::1d::SMA::{\"timeperiod\":20}"
    """
    props_json = json.dumps(properties, sort_keys=True)
    return f"{ticker}::{interval}::{indicator}::{props_json}"

async def fetch_and_broadcast_indicator(
    ticker: str, 
    interval: str, 
    indicator: str, 
    properties: dict
):
    """
    Continuously fetch indicator data and broadcast to all subscribers.
    
    Flow:
    1. Fetch latest indicator value from data.py using last_value()
    2. Compare with cached value to avoid duplicate sends
    3. Send updated value to all connected websockets
    4. Handle disconnected clients gracefully
    5. Sleep before next fetch cycle
    """
    indicator_id = generate_indicator_id(ticker, interval, indicator, properties)
    
    while True:
        try:
            # Fetch the latest indicator value for this ticker/interval/properties combo
            data = await last_value(
                ticker=ticker, 
                interval=interval, 
                indicator=indicator, 
                properties=properties
            )
            
            # Add metadata to response
            data["ticker"] = ticker
            data["interval"] = interval
            data["indicator"] = indicator
            # Include the original properties so clients can correlate messages
            data["properties"] = properties
            data["timestamp"] = datetime.datetime.now().isoformat()
            
            # Check if value changed to avoid redundant broadcasts
            if indicator_id in indicator_cache:
                if indicator_cache[indicator_id] == data:
                    # Value hasn't changed, skip broadcast
                    await asyncio.sleep(5)
                    continue
            
            # Update cache with new value
            indicator_cache[indicator_id] = data.copy()
            
            # Broadcast to all subscribers, track dead connections
            dead_connections = []
            for ws in indicator_subscribers[indicator_id]:
                try:
                    await ws.send_json(data)
                except Exception as e:
                    # Connection failed, mark for removal
                    dead_connections.append(ws)
                    print(f"Error sending to client for {indicator_id}: {e}")
            
            # Remove dead connections
            for ws in dead_connections:
                indicator_subscribers[indicator_id].remove(ws)
            
            # Wait before next update (5s intervals for real-time feel)
            await asyncio.sleep(5)
            
        except Exception as e:
            print(f"Error in fetch_and_broadcast_indicator for {indicator_id}: {e}")
            await asyncio.sleep(5)

def start_indicator_fetcher(ticker: str, interval: str, indicator: str, properties: dict):
    """
    Start a background task to fetch and broadcast indicator updates.
    Only starts if no task is already running for this indicator_id.
    
    Why: Prevents multiple tasks doing redundant work for same indicator.
    """
    indicator_id = generate_indicator_id(ticker, interval, indicator, properties)
    
    # Check if task already running
    if indicator_id not in indicator_fetcher_tasks:
        task = asyncio.create_task(
            fetch_and_broadcast_indicator(ticker, interval, indicator, properties)
        )
        indicator_fetcher_tasks[indicator_id] = task
        print(f"[INDICATOR] Started fetcher for {indicator_id}")

def stop_indicator_fetcher(ticker: str, interval: str, indicator: str, properties: dict):
    """
    Stop the background fetcher task for an indicator.
    Only stops if no subscribers remain for this indicator.
    
    Why: Clean up resources when no one is listening.
    """
    indicator_id = generate_indicator_id(ticker, interval, indicator, properties)
    
    # Only stop if we have this task and no more subscribers
    if indicator_id in indicator_fetcher_tasks and len(indicator_subscribers[indicator_id]) == 0:
        task = indicator_fetcher_tasks.pop(indicator_id)
        task.cancel()
        print(f"[INDICATOR] Stopped fetcher for {indicator_id}")

@app.websocket("/ws/indicator")
async def indicator_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time indicator updates.
    
    Message format (client -> server):
    {
        "action": "subscribe" or "unsubscribe",
        "ticker": "AAPL",
        "interval": "1d",
        "indicator": "SMA",
        "properties": {"timeperiod": 20}
    }
    
    Response format (server -> client):
    {
        "ticker": "AAPL",
        "interval": "1d",
        "indicator": "SMA",
        "timestamp": "2026-05-12T10:30:00",
        "value": 150.25,  // or {"UP": ..., "MIDDLE": ..., "DOWN": ...} for BBAND
        ...
    }
    """
    await websocket.accept()  # Accept WebSocket handshake
    
    # Track which indicators this client has subscribed to
    subscribed_indicators: set[str] = set()
    
    try:
        while True:
            # Receive subscription request from client
            msg = await websocket.receive_json()
            action = msg.get("action")
            ticker = msg.get("ticker", "").upper()
            interval = msg.get("interval", "")
            indicator = msg.get("indicator", "")
            properties = msg.get("properties", {})
            
            # Validate all required fields
            if not (ticker and action and interval and indicator and properties):
                await websocket.send_json({
                    "error": "Incomplete payload. Required: action, ticker, interval, indicator, properties"
                })
                continue
            
            indicator_id = generate_indicator_id(ticker, interval, indicator, properties)
            
            if action == "subscribe":
                # Check if already subscribed to prevent duplicates
                if indicator_id in subscribed_indicators:
                    await websocket.send_json({
                        "status": "error",
                        "message": f"Already subscribed to {indicator_id}"
                    })
                else:
                    # Add to subscription list
                    indicator_subscribers[indicator_id].append(websocket)
                    subscribed_indicators.add(indicator_id)
                    
                    # Start background fetcher if first subscriber
                    if len(indicator_subscribers[indicator_id]) == 1:
                        start_indicator_fetcher(ticker, interval, indicator, properties)
                    
                    await websocket.send_json({
                        "status": "subscribed",
                        "indicator_id": indicator_id,
                        "message": f"Now receiving {indicator} updates for {ticker}"
                    })
                    print(f"[INDICATOR] Client subscribed to {indicator_id}")
            
            elif action == "unsubscribe":
                # Check if we're actually subscribed
                if indicator_id not in subscribed_indicators:
                    await websocket.send_json({
                        "status": "error",
                        "message": f"Not subscribed to {indicator_id}"
                    })
                else:
                    # Remove from subscription
                    if websocket in indicator_subscribers[indicator_id]:
                        indicator_subscribers[indicator_id].remove(websocket)
                        subscribed_indicators.discard(indicator_id)
                        
                        # Stop fetcher if no more subscribers
                        stop_indicator_fetcher(ticker, interval, indicator, properties)
                        
                        await websocket.send_json({
                            "status": "unsubscribed",
                            "message": f"Stopped receiving {indicator} updates for {ticker}"
                        })
                        print(f"[INDICATOR] Client unsubscribed from {indicator_id}")
            
            else:
                await websocket.send_json({
                    "status": "error",
                    "message": f"Invalid action: {action}. Must be 'subscribe' or 'unsubscribe'"
                })
    
    except Exception as e:
        print(f"[INDICATOR] Error in websocket: {e}")
    
    finally:
        # Clean up when client disconnects
        # Remove this websocket from all indicator subscriptions
        for indicator_id in list(subscribed_indicators):
            if websocket in indicator_subscribers[indicator_id]:
                indicator_subscribers[indicator_id].remove(websocket)
                subscribed_indicators.discard(indicator_id)
            
            # Stop fetcher if no more subscribers
            if len(indicator_subscribers[indicator_id]) == 0:
                # Extract components from indicator_id
                parts = indicator_id.split("::", 2)
                if len(parts) >= 4:
                    ticker_part = parts[0]
                    interval_part = parts[1]
                    indicator_part = parts[2]
                    props_part = json.loads(indicator_id.split("::", 3)[3] if len(indicator_id.split("::", 3)) > 3 else "{}")
                    stop_indicator_fetcher(ticker_part, interval_part, indicator_part, props_part)
        
        await websocket.close()
        print(f"[INDICATOR] Client disconnected")



if __name__ =="__main__":
    print("Server Running in ws://127.0.0.1:8001")
    uvicorn.run("websockets_server:app", host = "127.0.0.1" , port=8001, reload=True)