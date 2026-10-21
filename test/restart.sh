#!/usr/bin/env bash
# Restart the local dev server (used by the smoke test).
cd "$(dirname "$0")/.."
pkill -f "node server.js" 2>/dev/null; sleep 0.5
nohup node server.js > /tmp/sfe.log 2>&1 &
for i in $(seq 1 40); do curl -sf -o /dev/null "http://127.0.0.1:${PORT:-3117}${BASE_PATH-/StaticsForEngineers}/healthz" && exit 0; sleep 0.25; done
echo "server did not start"; cat /tmp/sfe.log; exit 1
