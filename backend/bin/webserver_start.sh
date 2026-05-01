#!/usr/bin/env bash
# Start the Express API server in the background.
# Logs are written to backend/logs/ by the server itself.

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BACKEND_DIR="$( cd "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd )"

cd "${BACKEND_DIR}"

if [ ! -d node_modules ]; then
    echo "node_modules not found in ${BACKEND_DIR}. Run 'npm install' first."
    exit 1
fi

if [ ! -f .env ]; then
    echo "WARNING: ${BACKEND_DIR}/.env not found. Server may fail to start."
fi

mkdir -p logs

DATE_STAMP=$(date +%Y%m%d)
STDOUT_LOG="${BACKEND_DIR}/logs/webserver_api_${DATE_STAMP}.stdout.log"

echo "Starting webserver_api.js — stdout/stderr -> ${STDOUT_LOG}"
nohup node src/webserver_api.js >> "${STDOUT_LOG}" 2>&1 &
SERVER_PID=$!
echo "Spawned background pid=${SERVER_PID}"

sleep 1
if kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "Server started."
else
    echo "Server appears to have exited immediately. Check ${STDOUT_LOG}."
    exit 1
fi
