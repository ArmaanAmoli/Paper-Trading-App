#!/bin/bash
export PYTHONPATH="/app:/app/Main"

uvicorn Main.server:app --host 0.0.0.0 --port 8000 > /var/log/fastapihttp.logs 2>&1 &
uvicorn Main.websockets_server:app --host 0.0.0.0 --port 8001 > /var/log/fastapiws.logs 2>&1 &
wait -n