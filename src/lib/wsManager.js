
/* 
This class will manage multiple websockets connection with auto reconnect
*/
class WebSocketManager {
    constructor() {
        this.connections = {};
        // { name: { ws, handlers, reconnectTimer, shouldReconnect } }
        // 1 object of this class can store multiple connection
    }

    _buildIndicatorKey(properties) {
        // Keep the key stable by sorting property names before stringifying.
        const sortedProperties = Object.keys(properties)
            .sort()
            .reduce((accumulator, key) => {
                accumulator[key] = properties[key];
                return accumulator;
            }, {});

        // Match the backend's indicator_id format exactly.
        return `${properties.ticker}::${properties.interval}::${properties.indicator}::${JSON.stringify(sortedProperties)}`;
    }

    connect(name, url, options = {}) {
        /*
            name - a label we choose for connection
            url - The FastAPI websocket endpoint
            options - optional setting for now we just keep reconnectDelay
            subscribers - a json which store ticker as keys and set as values each set have setData() for diffrent component to trigger update at every element.
        */
        const { reconnectDelay = 3000 } = options;

        if (this.connections[name]?.ws?.readyState === WebSocket.OPEN) return; // if connection of this name is already open then return

        //Creating an entry object to store information about this connection
        const entry = {
            url,
            reconnectDelay,
            shouldReconnect: true, // flag: Should we try to reconnect if disconnected ?
            ws: null, // this is the actual websocket (filled by _open)
            reconnectTimer: null, // holds the retry timeout so we can cancel it
            subscribers: {},
            indicatorSubscriptions: {},
        };
        this.connections[name] = entry;
        this._open(name);
    }

    _open(name) { // real connection logic
        const entry = this.connections[name];
        if (!entry || !entry.shouldReconnect) return; // if connection not exist or shouldReconnect is false then return

        /* WebSocket is browser builtin API that opens a connection to a ws server */
        const ws = new WebSocket(entry.url);
        entry.ws = ws;

        // ATTACHING EVENT LISTENERS
        ws.onopen = () => // Fires when connection is successfully established
        {
            console.log(`[WS:${name}] connected`);
            clearTimeout(entry.reconnectTimer); // preventing .reconnectTimer() from reconnecting again

            //Resubscribe all Tickers after reconnecting
            Object.keys(entry.subscribers).forEach((key) => {
                // key can be a plain ticker or a JSON-stringified properties object
                try {
                    const parsed = JSON.parse(key);
                    const props = parsed;
                    const message = { action: "subscribe", ticker: props.ticker || undefined, interval: props.interval, indicator: props.indicator, properties: props };
                    this._send(name, message);
                } catch {
                    // not JSON => treat as plain ticker
                    this._send(name, { action: "subscribe", ticker: key });
                }
            })

            // Resubscribe indicator streams using the stored metadata.
            Object.values(entry.indicatorSubscriptions).forEach((subscription) => {
                this._send(name, {
                    action: "subscribe",
                    ticker: subscription.ticker,
                    interval: subscription.interval,
                    indicator: subscription.indicator,
                    properties: subscription.properties,
                });
            });
        }

        ws.onmessage = (event) => { //fires every time server sends data
            try {
                const data = JSON.parse(event.data);
                
                // Check if this is an indicator update or a quote update
                if (data.indicator && data.interval) {
                    // INDICATOR UPDATE: the backend sends indicator_id so the
                    // frontend can match the subscription without rebuilding it.
                    const indicator_id = data.indicator_id || this._buildIndicatorKey({
                        ticker: data.ticker,
                        interval: data.interval,
                        indicator: data.indicator,
                        ...data.properties,
                    });
                    let handlers = entry.subscribers[indicator_id];
                    // Debug: log whether we have handlers for this indicator_id
                    try {
                        console.debug(`[WS:${name}] indicator message for ${indicator_id} — handlers: ${handlers ? handlers.size : 0}`);
                    } catch (e) { /* ignore logging errors */ }

                    // Fallback: if exact id lookup fails, try matching by prefix
                    if (!handlers) {
                        const prefix = `${data.ticker}::${data.interval}::${data.indicator}::`;
                        const matched = Object.keys(entry.subscribers).filter(k => k.startsWith(prefix));
                        if (matched.length) {
                            handlers = new Set();
                            matched.forEach(k => {
                                const s = entry.subscribers[k];
                                if (s) s.forEach(fn => handlers.add(fn));
                            });
                            console.debug(`[WS:${name}] indicator message matched ${matched.length} subscriber keys by prefix`);
                        }
                    }

                    if (handlers) {
                        handlers.forEach((fn) => fn(data)); // Call each handler with indicator data
                    }
                } else if (data.ticker) {
                    // QUOTE UPDATE: Use ticker as key
                    const handlers = entry.subscribers[data.ticker];
                    if (handlers) {
                        handlers.forEach((fn) => fn(data)); // Call each handler with quote data
                    }
                }
            } catch (e) {
                console.warn(`[WS:${name}] bad JSON`, e);
            }
        }

        ws.onclose = () => {
            console.log(`[WS:${name}] closed — retrying in ${entry.reconnectDelay}ms`)
            if (entry.shouldReconnect) {
                entry.reconnectTimer = setTimeout(() => this._open(name), entry.reconnectDelay);
                //This will keep the connection persistent as onClose it sechedules _open() after .reconnectDelay ms.
            }
        };
        ws.onerror = (err) => console.error(`[WS:${name}] error`, err);// logs error and automatically fires .onclose() [INBUILT]
    }

    subscriber(name, ticker, handler, properties) { // add properties argument
        const entry = this.connections[name];
        if (!entry) return;
        if (arguments.length === 3) {
            if (!entry.subscribers[ticker]) entry.subscribers[ticker] = new Set();
            const isFirst = entry.subscribers[ticker].size === 0;
            entry.subscribers[ticker].add(handler);
            if (isFirst) {
                this._send(name, { action: "subscribe", ticker });
                console.log(`WS-${name}:${ticker} subscribed`);
            }
        }
        else if (arguments.length === 4) {
            // ticker = msg.get("ticker")
            // interval = msg.get("interval")
            // indicator = msg.get("interval")
            // properties = msg.get("properties")
            const interval = properties.interval;
            const indicator = properties.indicator;
            //id:str = ticker + '::' + interval + '::' + indicator + '::' + json.dump(properties)
            const id = this._buildIndicatorKey({ ticker, interval, indicator, ...properties });
            if(!entry.subscribers[id]){
                entry.subscribers[id] = new Set();
            }
            const isFirst = entry.subscribers[id].size === 0;
            entry.subscribers[id].add(handler);
            if (isFirst) {
                const message = {action: "subscribe" , ticker , interval , indicator , properties}
                this._send(name , message);
                console.log(`WS-${name}:${id} subscribed`)
                // Keep the subscription metadata for reconnects.
                entry.indicatorSubscriptions[id] = { ticker, interval, indicator, properties };
            }
            
        }
    }

    unsubscriber(name, ticker, handler, properties) {
        /**
         * Unsubscribe a handler from a ticker or indicator.
         * 
         * For quotes (3 args): Removes handler and sends unsubscribe if last handler
         * For indicators (4 args): Removes handler and sends unsubscribe if last handler
         */
        const entry = this.connections[name];
        if (!entry) return;

        if (arguments.length === 3) {
            // QUOTE UNSUBSCRIPTION - 3 arguments: name, ticker, handler
            if (entry.subscribers[ticker]) {
                entry.subscribers[ticker].delete(handler);
                // Only send unsubscribe to server if this was the last handler
                if (entry.subscribers[ticker].size === 0) {
                    this._send(name, { action: "unsubscribe", ticker });
                    delete entry.subscribers[ticker];
                    console.log(`WS-${name}:${ticker} unsubscribed`);
                }
            }
        }

        else if (arguments.length === 4) {
            // INDICATOR UNSUBSCRIPTION - 4 arguments: name, ticker, handler, properties
            // properties contains: {indicator, interval, ticker, ...otherProps}
            const interval = properties.interval;
            const indicator = properties.indicator;
            
            // Generate same key as subscriber method for consistency
            const id = this._buildIndicatorKey({ ticker, interval, indicator, ...properties });

            
            if (entry.subscribers[id]) {
                entry.subscribers[id].delete(handler);
                
                // Only send unsubscribe if this was the last handler for this indicator
                if (entry.subscribers[id].size === 0) {
                    delete entry.subscribers[id];
                    delete entry.indicatorSubscriptions[id];
                    // FIXED: Pass 'name' as first arg to _send()
                    this._send(name, {
                        action: "unsubscribe",
                        ticker,
                        interval,
                        indicator,
                        properties
                    });
                    console.log(`WS-${name}:${id} unsubscribed`);
                }
            } else {
                console.warn(`WS-${name}:${id} was not subscribed`);
            }
        }
    }

    _send(name, payload) { // sending payload
        const ws = this.connections[name]?.ws;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
        }
    }

    disconnect(name) {
        const entry = this.connections[name];
        if (!entry) return;
        entry.shouldReconnect = false; // This will stop the retry loop
        clearTimeout(entry.reconnectTimer); // If by chance a reconnect is scheduled we would cancel it
        entry.ws?.close(); // final close
        delete this.connections[name];
    }
}

export const wsManager = new WebSocketManager(); // one Manager for the entire app