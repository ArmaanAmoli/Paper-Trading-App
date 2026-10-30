#!/bin/bash
export PYTHONPATH="/home/armaan/Projects/paper-trading-app/YahooFinanceDataPipeline:/home/armaan/Projects/paper-trading-app/YahooFinanceDataPipeline/Main"

mkdir -p /home/armaan/Projects/paper-trading-app/YahooFinanceDataPipeline/logs
chmod 777 /home/armaan/Projects/paper-trading-app/YahooFinanceDataPipeline/logs

cd /home/armaan/Projects/paper-trading-app/YahooFinanceDataPipeline

uvicorn Main.server:app --host 0.0.0.0 --port 8000 > ./logs/fastapihttp.logs 2>&1 &
HTTP_PID=$!
uvicorn Main.websockets_server:app --host 0.0.0.0 --port 8001 > ./logs/fastapiws.logs 2>&1 &
WS_PID=$!

echo "HTTP server PID: $HTTP_PID"
echo "WebSocket server PID: $WS_PID"

# Wait for both processes
wait $HTTP_PID
wait $WS_PID
