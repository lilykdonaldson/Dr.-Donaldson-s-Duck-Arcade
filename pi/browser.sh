#!/usr/bin/env bash
set -eu
# Cage remains open even if Chromium is closed with a keyboard shortcut.
while true; do
  # Wait for local services, never for internet connectivity.
  until /usr/bin/node -e 'Promise.all(["http://127.0.0.1:8080/api/config","http://127.0.0.1:8081/arcade-input.js"].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error()}))).then(()=>process.exit(0)).catch(()=>process.exit(1))'; do
    sleep 1
  done
  /usr/bin/chromium --ozone-platform=wayland --kiosk --no-first-run \
    --noerrdialogs --disable-session-crashed-bubble \
    --disable-pinch --overscroll-history-navigation=0 \
    --autoplay-policy=no-user-gesture-required \
    --user-data-dir="$HOME/.config/duck-arcade-browser" \
    http://127.0.0.1:8080/ || true
  sleep 2
done
