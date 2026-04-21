/* 
This class will manage multiple websockets connection with auto reconnect
*/

class WebSocketManager{
    constructor(){
        this.connections = {};
        // { name: { ws, handlers, reconnectTimer, shouldReconnect } }
        // 1 object of this class can store multiple connection
    }

    connect(name , url , onMessage , options={}){
        /*
            name - a label we choose for connection
            url - The FastAPI websocket endpoint
            onMessage - A function that we provide that get called every time new data arrives
            options - optional setting for now we just keep reconnectDelay
        */
        const {reconnectDelay = 3000} = options;

        if(this.connections[name]?.ws?.readyState === WebSocket.OPEN) return; // if connection of this name is already open then return

        //Creating an entry object to store information about this connection
        const entry = {
            url,
            onMessage,
            reconnectDelay,
            shouldReconnect: true, // flag: Should we try to reconnect if disconnected ?
            ws:null, // this is the actual websocket (filled by _open)
            reconnectTimer: null , // holds the retry timeout so we can cancel it
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
        }

        ws.onmessage = (event) => { //fires every time server sends data
            try{
                const data = JSON.parse(event.data);
                entry.onMessage(data);
            }catch(e){
                console.warn(`[WS:${name}] bad JSON` , e);
            }
        }

        ws.onclose=()=>{
            if(entry.shouldReconnect){
                entry.reconnectTimer = setTimeout(() => this._open(name) , entry.reconnectDelay);
                //This will keep the connection persistent as onClose it sechedules _open() after .reconnectDelay ms.
            }
        };

        ws.onerror = (err) => console.error(`[WS:${name}] error`, err);// logs error and automatically fires .onclose() [INBUILT]
    }

    send(name , payload){ // sending payload
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