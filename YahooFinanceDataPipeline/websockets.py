from fastapi import  WebSocket , FastAPI , WebSocketDisconnect
import asyncio
from currency import update_rates_every_24h , get_currency
from contextlib import asynccontextmanager
import yfinance as yf
import currency

'''
This is an under development websocket server whose purpose
is to reduce constant http polling.
'''

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
app = FastAPI()

@app.websocket("/ws/{ticker}")
async def fetchTickerQuote(websocket: WebSocket , ticker:str):
    try:
        while True:
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
            
            await websocket.send_json(response)
            
    except WebSocketDisconnect:
        print(f"{ticker} client disconnected")
    finally:
        await websocket.close()
