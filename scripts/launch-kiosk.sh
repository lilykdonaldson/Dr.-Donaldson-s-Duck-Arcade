#!/usr/bin/env bash
set -euo pipefail
ARCADE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ARCADE_DIR"
command -v node >/dev/null || { echo 'Install Node.js before launching the arcade.' >&2; exit 1; }
if command -v chromium >/dev/null; then
  ARCADE_BROWSER=chromium
elif command -v chromium-browser >/dev/null; then
  ARCADE_BROWSER=chromium-browser
else
  echo 'Install Chromium before launching the arcade.' >&2
  exit 1
fi
export PORT="${PORT:-8080}"
node server.cjs &
ARCADE_SERVER_PID=$!
trap 'kill "$ARCADE_SERVER_PID" 2>/dev/null || true' EXIT
# Wait for our server, without waiting for an internet connection.
for attempt in {1..40}; do
  kill -0 "$ARCADE_SERVER_PID" 2>/dev/null || { echo 'Arcade server failed to start.' >&2; exit 1; }
  if node -e 'fetch("http://127.0.0.1:"+process.env.PORT+"/games.json").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'; then
    break
  fi
  if [[ "$attempt" == 40 ]]; then echo 'Arcade server did not become ready.' >&2; exit 1; fi
  sleep 0.25
done
"$ARCADE_BROWSER" \
  --kiosk \
  --no-first-run \
  --noerrdialogs \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --user-data-dir="$ARCADE_DIR/.kiosk-profile" \
  "http://127.0.0.1:$PORT/"
