#!/usr/bin/env bash
# Stop the Express API server by calling its POST /shutdown endpoint.
# Never uses 'kill' — relies on the server's graceful shutdown handler.

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BACKEND_DIR="$( cd "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd )"

PORT_NUMBER=3001
if [ -f "${BACKEND_DIR}/config/webserver.json" ]; then
    PORT_NUMBER=$(node -e "console.log(require('${BACKEND_DIR}/config/webserver.json').port || 3001)")
fi

echo "Sending POST /shutdown to http://127.0.0.1:${PORT_NUMBER}/shutdown"

node -e "
const http = require('http');
const req = http.request({
    host: '127.0.0.1',
    port: ${PORT_NUMBER},
    path: '/shutdown',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': 2 }
}, function(res) {
    let body = '';
    res.on('data', function(chunk) { body = body + chunk; });
    res.on('end', function() { console.log('Server response: ' + body); });
});
req.on('error', function(err) { console.error('Shutdown request failed: ' + err.message); process.exit(1); });
req.write('{}');
req.end();
"
