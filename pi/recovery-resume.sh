#!/usr/bin/env bash
set -euo pipefail
[[ "$(id -u)" == 0 ]] || exit 1
[[ -e /run/duck-arcade/recovery ]] || exit 0
# A normal logout returns to the kiosk, but never launch it during shutdown.
case "$(systemctl is-system-running 2>/dev/null || true)" in
  running|degraded|starting) ;;
  *) exit 0 ;;
esac
rm -f -- /run/duck-arcade/recovery
systemctl start --no-block greetd.service
/usr/bin/chvt 1 || true
