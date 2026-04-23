
/* 
This class will manage multiple websockets connection with auto reconnect
*/
class WebSocketManager{
    constructor(){
        this.connections = {};
        // { name: { ws, handlers, reconnectTimer, shouldReconnect } }
        // 1 object of this class can store multiple connection
    }

    connect(name , url , options={}){
        /*
            name - a label we choose for connection
            url - The FastAPI websocket endpoint
            options - optional setting for now we just keep reconnectDelay
            subscribers - a json which store ticker as keys and set as values each set have setData() for diffrent component to trigger update at every element.
        */
        const {reconnectDelay = 3000} = options;

        if(this.connections[name]?.ws?.readyState === WebSocket.OPEN) return; // if connection of this name is already open then return

        //Creating an entry object to store information about this connection
        const entry = {
            url,
            reconnectDelay,
            shouldReconnect: true, // flag: Should we try to reconnect if disconnected ?
            ws:null, // this is the actual websocket (filled by _open)
            reconnectTimer: null , // holds the retry timeout so we can cancel it
            subscribers:{},
        };
        this.connections[name] = entry;
        this._open(name);
    }

    _open(name){ // real connection logic
        const entry = this.connections[name];
        if(!entry || !entry.shouldReconnect) return; // if connection not exist or shouldReconnect is false then return

        /* WebSocket is browser builtin API that opens a connection to a ws server */
        const ws = new WebSocket(entry.url);
        entry.ws = ws;

        // ATTACHING EVENT LISTENERS
        ws.onopen = () => // Fires when connection is successfully established
        {
            console.log(`[WS:${name}] connected`);
            clearTimeout(entry.reconnectTimer); // preventing .reconnectTimer() from reconnecting again

            //Resubscribe all Tickers after reconnecting
            Object.keys(entry.subscribers).forEach((ticker)=>{
                this._send(name , {action:"subscribe" , ticker})
            })
        }

        ws.onmessage = (event) => { //fires every time server sends data
            try{
                const data = JSON.parse(event.data);
                const handlers = entry.subscribers[data.ticker];
                if(handlers){
                    handlers.forEach((fn)=> fn(data)); // each handler fn is a setData for a react element.
                }
            }catch(e){
                console.warn(`[WS:${name}] bad JSON` , e);
            }
        }

        ws.onclose=()=>{
            console.log(`[WS:${name}] closed — retrying in ${entry.reconnectDelay}ms`)
            if(entry.shouldReconnect){
                entry.reconnectTimer = setTimeout(() => this._open(name) , entry.reconnectDelay);
                //This will keep the connection persistent as onClose it sechedules _open() after .reconnectDelay ms.
            }
        };
        ws.onerror = (err) => console.error(`[WS:${name}] error`, err);// logs error and automatically fires .onclose() [INBUILT]
    }

    subscriber(name , ticker , handler){
        const entry = this.connections[name];
        if (!entry) return;
        if(!entry.subscribers[ticker]) entry.subscribers[ticker] = new Set();
        const isFirst = entry.subscribers[ticker].size === 0;
        entry.subscribers[ticker].add(handler);
        if(isFirst){
            this._send(name , {action:"subscribe" , ticker});
            console.log(`WS:${ticker} subscribed`);
        }
    }

    unsubscriber(name , ticker , handler){
        const entry = this.connections[name];
        if (!entry) return;
        entry.subscribers[ticker].delete[handler] // delete the handler fn in case of component unmount
        if(entry.subscribers.has(ticker)){
            entry.subscribers.delete(ticker);
            this._send(name , {action:"unsubscribe" , ticker});
            console.log(`WS:${ticker} unsubscribed`);
        };
    }

    _send(name , payload){ // sending payload
        const ws = this.connections[name]?.ws;
        if(ws?.readyState === WebSocket.OPEN ){
            ws.send(JSON.stringify(payload));
        }
    }

    disconnect(name){
        const entry = this.connections[name];
        if(!entry)return;
        entry.shouldReconnect = false; // This will stop the retry loop
        clearTimeout(entry.reconnectTimer); // If by chance a reconnect is scheduled we would cancel it
        entry.ws?.close(); // final close
        delete this.connections[name];
    }
}

export const wsManager = new WebSocketManager(); // one Manager for the entire app