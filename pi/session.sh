#!/usr/bin/env bash
set -eu
# No -s flag: Cage's VT-switching option is deliberately disabled.
unset DISPLAY WAYLAND_DISPLAY
export XKB_DEFAULT_OPTIONS=''
exec /usr/bin/cage -d -- /usr/local/lib/duck-arcade/pi/browser.sh
