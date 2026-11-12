#!/usr/bin/env bash
set -euo pipefail
[[ "$(id -u)" == 0 ]] || { echo 'Run as administrator with sudo.' >&2; exit 1; }
[[ "$#" == 0 || ( "$#" == 1 && "${1:-}" == --boot ) ]] || exit 1
install -d -m 0755 /run/duck-arcade
touch /run/duck-arcade/recovery
trap '/usr/local/libexec/duck-arcade-recovery-resume' ERR
if [[ "${1:-}" != --boot ]]; then systemctl stop greetd.service; fi
systemctl start duck-arcade-recovery.service
/usr/bin/chvt 2
# The SD-card flag is one-shot. A later normal reboot returns to the kiosk.
if [[ "${1:-}" == --boot ]]; then rm -f -- /boot/firmware/duck-arcade-recovery.txt; fi
