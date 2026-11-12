#!/usr/bin/env bash
# Run on a NEW Raspberry Pi OS Lite 64-bit installation, from this repository.
set -euo pipefail
if [[ "$(id -u)" != 0 ]]; then echo 'Run with sudo bash pi/install.sh' >&2; exit 1; fi
if [[ "$(uname -m)" != aarch64 ]] || ! grep -qa 'Raspberry Pi' /proc/device-tree/model; then
  echo 'This installer targets Raspberry Pi OS Lite 64-bit on a Raspberry Pi.' >&2; exit 1
fi
SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_URL="${ARCADE_REPOSITORY:-https://github.com/lilykdonaldson/Dr.-Donaldson-s-Duck-Arcade.git}"
REPO_BRANCH="${ARCADE_BRANCH:-main}"
if [[ ! "$REPO_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\.git$ ]] || [[ ! "$REPO_BRANCH" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || [[ "$REPO_BRANCH" == *..* ]]; then
  echo 'Use a public GitHub HTTPS repository and a valid branch name.' >&2; exit 1
fi
# Prevent accidentally replacing a desktop or a previously customised installation.
if systemctl is-enabled --quiet lightdm.service 2>/dev/null; then
  echo 'Use a fresh Lite image; this installer does not replace an existing desktop.' >&2; exit 1
fi
# Package installation must not start the display manager and kill a local
# tty1 login that is running this installer. It is enabled only at the end.
systemctl mask greetd.service
apt-get update
apt-get install -y nodejs git chromium cage greetd seatd libpam-systemd python3-dbus network-manager sudo kbd util-linux
node -e 'if(Number(process.versions.node.split(".")[0])<18)process.exit(1)'
for account in duckweb duckmaint duckupdate; do
  id "$account" >/dev/null 2>&1 || useradd --system --user-group --no-create-home --shell /usr/sbin/nologin "$account"
done
id duckkiosk >/dev/null 2>&1 || useradd --create-home --user-group --shell /bin/sh duckkiosk
passwd -l duckkiosk >/dev/null
for group in video render input audio; do getent group "$group" >/dev/null && usermod -aG "$group" duckkiosk; done
install -d -m 0755 /usr/local/lib/duck-arcade/{maintenance,scripts,pi} /usr/local/libexec /etc/duck-arcade /etc/chromium/policies/managed
install -d -m 0755 -o duckupdate -g duckweb /opt/duck-arcade /opt/duck-arcade/releases
install -d -m 0755 /var/lib/duck-arcade
install -d -m 2750 -o duckupdate -g duckmaint /var/lib/duck-arcade/update-state
install -m 0644 "$SOURCE_DIR/server.cjs" /usr/local/lib/duck-arcade/server.cjs
install -m 0644 "$SOURCE_DIR/maintenance/"* /usr/local/lib/duck-arcade/maintenance/
install -m 0644 "$SOURCE_DIR/scripts/set-admin-password.cjs" /usr/local/lib/duck-arcade/scripts/
install -m 0644 "$SOURCE_DIR/pi/update.cjs" /usr/local/lib/duck-arcade/pi/
install -m 0755 "$SOURCE_DIR/pi/browser.sh" "$SOURCE_DIR/pi/session.sh" /usr/local/lib/duck-arcade/pi/
install -m 0755 "$SOURCE_DIR/pi/duck-arcade-control.py" /usr/local/libexec/duck-arcade-control
install -m 0755 "$SOURCE_DIR/pi/recovery-open.sh" /usr/local/libexec/duck-arcade-recovery-open
install -m 0755 "$SOURCE_DIR/pi/recovery-resume.sh" /usr/local/libexec/duck-arcade-recovery-resume
install -m 0644 "$SOURCE_DIR/pi/chromium-policy.json" /etc/chromium/policies/managed/duck-arcade.json
if [[ ! -e /etc/duck-arcade/device.json ]]; then
  node - "$REPO_URL" "$REPO_BRANCH" <<'NODE'
const fs=require('fs');fs.writeFileSync('/etc/duck-arcade/device.json',JSON.stringify({repository:process.argv[2],branch:process.argv[3]},null,2));
NODE
fi
if [[ ! -e /etc/duck-arcade/admin.json ]]; then
  node /usr/local/lib/duck-arcade/scripts/set-admin-password.cjs /etc/duck-arcade/admin.json
fi
chown root:duckmaint /etc/duck-arcade/admin.json
chmod 0640 /etc/duck-arcade/admin.json
chmod 0644 /etc/duck-arcade/device.json
SUDO_RULE=/etc/sudoers.d/duck-arcade-maintenance
printf 'duckmaint ALL=(root) NOPASSWD: ' > "$SUDO_RULE"
separator=''
for action in status scan connect enable-wifi update rollback reboot shutdown recovery; do
  printf '%s/usr/local/libexec/duck-arcade-control %s' "$separator" "$action" >> "$SUDO_RULE"
  separator=', '
done
printf '\n' >> "$SUDO_RULE"
chmod 0440 "$SUDO_RULE"
visudo -cf "$SUDO_RULE"
if [[ ! -d /var/lib/duck-arcade/repo/.git ]]; then
  install -d -o duckupdate -g duckupdate -m 0755 /var/lib/duck-arcade/repo
  runuser -u duckupdate -- git clone --single-branch --branch "$REPO_BRANCH" "$REPO_URL" /var/lib/duck-arcade/repo
fi
# Prepare a validated first release BEFORE enabling the restricted session.
runuser -u duckupdate -- node /usr/local/lib/duck-arcade/pi/update.cjs update
for role in launcher games; do
  port=8080; [[ "$role" == games ]] && port=8081
  cat > "/etc/systemd/system/duck-arcade-$role.service" <<EOF
[Unit]
Description=Duck Arcade $role server
After=local-fs.target
[Service]
User=duckweb
Group=duckweb
Environment=ARCADE_ROOT=/opt/duck-arcade/current
Environment=ARCADE_ROLE=$role
Environment=ARCADE_GAME_ORIGIN=http://127.0.0.1:8081
Environment=PORT=$port
ExecStart=/usr/bin/node /usr/local/lib/duck-arcade/server.cjs
Restart=always
RestartSec=2
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
[Install]
WantedBy=multi-user.target
EOF
done
cat > /etc/systemd/system/duck-arcade-maintenance.service <<'EOF'
[Unit]
Description=Duck Arcade password-protected maintenance
After=NetworkManager.service
[Service]
User=duckmaint
Group=duckmaint
ExecStart=/usr/bin/node /usr/local/lib/duck-arcade/maintenance/server.cjs
Restart=always
RestartSec=2
ProtectSystem=full
ProtectHome=yes
PrivateTmp=yes
[Install]
WantedBy=multi-user.target
EOF
for action in update rollback; do
  cat > "/etc/systemd/system/duck-arcade-$action.service" <<EOF
[Unit]
Description=Duck Arcade $action
After=network.target
[Service]
Type=oneshot
User=duckupdate
Group=duckupdate
UMask=0022
ExecStart=/usr/bin/node /usr/local/lib/duck-arcade/pi/update.cjs $action
TimeoutStartSec=300
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=/var/lib/duck-arcade /opt/duck-arcade
ProtectHome=yes
PrivateTmp=yes
EOF
done
cat > /etc/systemd/system/duck-arcade-recovery.service <<'EOF'
[Unit]
Description=Duck Arcade authenticated local administrator login
After=systemd-user-sessions.service
Conflicts=getty@tty2.service
[Service]
Type=idle
ExecStart=/sbin/agetty --noclear --timeout 120 --issue-file /etc/duck-arcade/recovery.issue tty2 linux
ExecStopPost=/usr/local/libexec/duck-arcade-recovery-resume
StandardInput=tty
StandardOutput=tty
TTYPath=/dev/tty2
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes
SendSIGHUP=yes
Restart=no
EOF
cat > /etc/systemd/system/duck-arcade-boot-recovery.service <<'EOF'
[Unit]
Description=One-shot Duck Arcade local recovery from SD-card marker
After=systemd-user-sessions.service
Before=greetd.service
ConditionPathExists=/boot/firmware/duck-arcade-recovery.txt
[Service]
Type=oneshot
ExecStart=/usr/local/libexec/duck-arcade-recovery-open --boot
[Install]
WantedBy=graphical.target
EOF
cat > /etc/duck-arcade/recovery.issue <<'EOF'
Dr. Donaldson's Duck Arcade - LOCAL ADMINISTRATOR RECOVERY
Sign in with the Linux administrator credentials created in Raspberry Pi Imager.
No network or SSH connection is required. Unused login closes after 120 seconds.
After repairs, type exit to return to the locked arcade.
Wi-Fi: sudo nmtui
EOF
install -d /etc/systemd/system/greetd.service.d
cat > /etc/systemd/system/greetd.service.d/duck-arcade-recovery.conf <<'EOF'
[Unit]
ConditionPathExists=!/run/duck-arcade/recovery
EOF
install -d /etc/greetd
if [[ -f /etc/greetd/config.toml && ! -f /etc/greetd/config.toml.before-duck-arcade ]]; then
  cp /etc/greetd/config.toml /etc/greetd/config.toml.before-duck-arcade
fi
cat > /etc/greetd/config.toml <<'EOF'
[terminal]
vt = 1
[default_session]
command = "/usr/local/lib/duck-arcade/pi/session.sh"
user = "duckkiosk"
EOF
install -d /etc/systemd/logind.conf.d
cat > /etc/systemd/logind.conf.d/duck-arcade.conf <<'EOF'
[Login]
NAutoVTs=0
ReserveVT=0
HandlePowerKey=ignore
EOF
printf 'kernel.sysrq = 0\n' > /etc/sysctl.d/90-duck-arcade.conf
systemctl mask ctrl-alt-del.target getty@tty1.service getty@tty2.service getty@tty3.service getty@tty4.service getty@tty5.service getty@tty6.service
systemctl daemon-reload
systemctl enable --now NetworkManager.service seatd.service duck-arcade-launcher.service duck-arcade-games.service duck-arcade-maintenance.service
systemctl unmask greetd.service
systemctl enable greetd.service
systemctl enable duck-arcade-boot-recovery.service
systemctl set-default graphical.target
echo 'Installed. Keep your Linux administrator credentials. Reboot when ready to enter the kiosk.'
echo 'Maintenance: Ctrl+Alt+M, then the password you just set.'
