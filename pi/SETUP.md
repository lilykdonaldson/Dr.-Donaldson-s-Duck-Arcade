# Install the Raspberry Pi cabinet

Target: a fresh **Raspberry Pi OS Lite (64-bit)** image on the Pi 4. Lite is intentional: Cage runs Chromium without a desktop, panel, or file manager behind the arcade. The installer changes login, Chromium policy, and console settings on a dedicated Pi. It does not reformat an SD card or configure this Windows computer.

## Prepare and install

1. Use Raspberry Pi Imager to write Raspberry Pi OS Lite (64-bit). Set hostname `duck-arcade`, your own administrator username/password, Wi-Fi country and setup network, and keyboard layout. SSH is optional; enable it with your public key if your network allows it. Keep a usable Linux administrator password for local recovery.
2. Boot with the Pi's monitor and a USB keyboard attached, then log in locally with the administrator account from Imager. If needed, use `sudo nmtui` to connect to Wi-Fi. Alternatively, SSH from your computer with `ssh YOUR_ADMIN@duck-arcade.local`. Keep this Linux login separate from the maintenance password.
3. **Commit and push the prepared app and game files to GitHub first.** The installer uses committed files from `main`, including Game Lab exports and the MakeCode `built.json` and runtime. It cannot install this computer's uncommitted changes. No changes have been pushed automatically during this work.
4. Run the following directly on the Pi, or in an optional SSH session:

```sh
sudo apt update
sudo apt install -y git
git clone https://github.com/lilykdonaldson/Dr.-Donaldson-s-Duck-Arcade.git ~/duck-arcade-setup
cd ~/duck-arcade-setup
sudo bash pi/install.sh
```

Create a maintenance password of at least 12 characters when prompted. Input is hidden; only its salted hash is stored at `/etc/duck-arcade/admin.json`, outside Git. Keep it in your password manager.

The installer installs the runtime and services, then validates the first release before enabling the restricted session. If it fails, resolve the error in the same terminal before rebooting. The current installer uses a public GitHub HTTPS repository and branch `main`; private-repository credentials require separate administrator configuration. Never embed access tokens in URLs or game files.

When installation completes, run `sudo reboot`. Keep the monitor, USB keyboard, Linux administrator credentials, and SD-card reader available during the first boot and acceptance checks. The Pi should show the duck opening screen. Setup and updates need internet; gameplay and local recovery do not need SSH or a network connection.

## Student mode

Cage displays the browser without a normal desktop. Its console-switching option is disabled. Closing Chromium launches it again. The student account has no sudo access; browser policies restrict external destinations, developer tools, file dialogs, downloads, printing, and extensions. Console switching and Ctrl+Alt+Delete are disabled for this installation.

This protects ordinary classroom keyboard use. Physical access to the SD card, boot media, or cabinet internals can bypass OS restrictions, so protect those physically. Confirm the lockdown checks below on your actual device before student use.

## Maintenance

Connect an administrator keyboard and press **Ctrl+Alt+M** in any menu or game, then enter the maintenance password. The game stops before the maintenance screen opens. The panel includes:

- Current version, uptime, active network, IP addresses, and GitHub DNS/TCP reachability.
- Wi-Fi enable, scan, and connection for open and WPA/WPA2 personal networks.
- Update from GitHub and restore the previous installed release.
- Restart and safe shutdown with confirmation.
- Open administrator login: a local, authenticated Linux console for repairs without SSH.
- Lock and return to the arcade, plus automatic locking after five minutes of inactivity.

Wi-Fi passwords go to NetworkManager over D-Bus, without shell arguments or helper logs. Saved credentials are stored by NetworkManager's normal system configuration. WPA3-only, school enterprise/802.1X Wi-Fi, and captive portals require administrator/IT configuration beyond the simple Wi-Fi form. Local administrator recovery provides a terminal for `sudo nmtui` and other network diagnostics. If Wi-Fi fails, both the local panel and local login still work; Ethernet and SSH remain optional alternatives.

The panel cannot power on a fully shut-down Pi. Wait for shutdown to complete before unplugging it; power it on using the supply or appropriate physical hardware.

## Updating app and games

On your development computer: edit, test, commit, and push. On the Pi: unlock maintenance, choose **Update from GitHub**, refresh diagnostics to see the result, then lock and return to the arcade.

The equivalent SSH action is:

```sh
sudo systemctl start duck-arcade-update.service
sudo journalctl -u duck-arcade-update.service -n 50 --no-pager
```

The updater fetches and fast-forwards a dedicated checkout, validates a complete release, then switches the active link. It refuses local changes and rewritten history. It does not run repository installation scripts or npm install. A failed validation leaves the current release available. The app refreshes on version changes between games, never in the middle of play.

Use the panel's **Restore previous version**, or run:

```sh
sudo systemctl start duck-arcade-rollback.service
```

Releases remain under `/opt/duck-arcade/releases/`. Automatic pruning is not implemented: monitor SD-card space and remove obsolete releases through administrator maintenance, preserving the `current` and `previous` targets. If power is lost during an update, check that both update units are inactive before using `rmdir /var/lib/duck-arcade/update-state/lock` to clear its stale lock.

App/game updates do not replace the privileged helper, maintenance service, static server, browser policies, or OS. To update those trusted components, review and pull changes in `~/duck-arcade-setup`, rerun `sudo bash pi/install.sh`, and reboot. Apply OS package updates through the administrator account.

## Local recovery without SSH

**Normal repairs:** connect a USB keyboard, press Ctrl+Alt+M, enter the maintenance password, and choose **Open administrator login**. Confirm. The kiosk closes and the monitor shows a standard Linux login. Enter the administrator username and password created in Raspberry Pi Imager, not the maintenance password. No account is logged in automatically.

Use `sudo nmtui` for network configuration and the diagnostic commands below for repairs. When finished, type `exit` to sign out; the console closes and the locked kiosk returns automatically. An unused login prompt returns to the kiosk after 120 seconds. Do not leave an authenticated terminal unattended. To abandon recovery before signing in, wait for that timeout or reboot normally.

**If the web app or maintenance login is unavailable:**

1. Power off the Pi safely when possible. Put its microSD card into your Windows computer.
2. On the small boot partition (usually named `bootfs`), create an empty file named exactly `duck-arcade-recovery.txt`. Enable filename extensions in Explorer to avoid accidentally naming it `.txt.txt`.
3. Safely eject the card, return it to the Pi, connect monitor and keyboard, and boot.
4. The Pi opens the same password-protected Linux login instead of the browser. The marker is consumed once recovery opens. A subsequent normal reboot starts the kiosk again.
5. Sign in with the Linux administrator account, make repairs, and type `exit` to return to the kiosk.

This fallback does not depend on the web app, Wi-Fi, SSH, or the maintenance password, but still requires the Linux administrator password. Losing both passwords requires restoring administrator access or reimaging the SD card; there is no built-in password bypass.

## Architecture and recovery commands

| Component | Account | Address / path |
| --- | --- | --- |
| Launcher | duckweb | 127.0.0.1:8080 |
| Sandboxed games | duckweb | 127.0.0.1:8081 |
| Maintenance | duckmaint | 127.0.0.1:8082 |
| Repository updater | duckupdate | /var/lib/duck-arcade/repo |
| Active / previous release | updater-owned links | /opt/duck-arcade/current, /opt/duck-arcade/previous |
| Fixed device helper | root-owned | /usr/local/libexec/duck-arcade-control |

Services bind only to loopback. Student games have a separate origin, sandbox restrictions, and no maintenance token or sudo permission. Only the maintenance service may invoke the fixed-action helper. Runtime secrets and private repository files are not served by the static server.

Reset a forgotten maintenance password from the local recovery login (use the SD-card method if necessary), or optional SSH:

```sh
sudo node /usr/local/lib/duck-arcade/scripts/set-admin-password.cjs /etc/duck-arcade/admin.json
sudo systemctl restart duck-arcade-maintenance.service
```

Useful diagnostics:

```sh
sudo systemctl status greetd duck-arcade-launcher duck-arcade-games duck-arcade-maintenance
sudo journalctl -b -u greetd -u duck-arcade-launcher -u duck-arcade-maintenance --no-pager
nmcli device status
sudo nmtui
```

If you use SSH, stop the screen with `sudo systemctl stop greetd` and resume with `sudo systemctl start greetd`. For the local console, simply sign out with `exit`; its service returns to the kiosk. The Lite installation has no normal desktop. Keep the Linux administrator credentials available separately from the maintenance password.

## Acceptance checks before classroom use

Automated Windows tests cover UI authentication, expiry, recovery/shutdown confirmation, game-origin separation, maintenance-key forwarding, gameplay, and release validation. Python tests exercise helper routing and password handling without real device actions. Shell scripts have syntax checks. Linux boot, local console handoff/logout, SD-card recovery, NetworkManager, power actions, effective Chromium policies, and Git release activation still need testing on the Pi.

1. Cold boot offline. Play all three games and test the four-arrow home shortcut and audio.
2. Check Alt+F4 reopens Chromium; F11, Ctrl+L, Ctrl+O, F12, Ctrl+Shift+I, Ctrl+Alt+F2, and Ctrl+Alt+Delete must not expose a desktop, files, terminal, or another website. Verify effective policies during administrator setup.
3. Open maintenance from each game. Check wrong passwords fail, inactivity locks, and returning to games clears the session.
4. Scan and reconnect to real Wi-Fi; test Ethernet recovery and a disconnected boot.
5. Install a valid update, reject an invalid game manifest, and restore the previous release. Ensure an active game is not interrupted.
6. Confirm restart returns to the arcade and shutdown completes safely. Test the actual button encoder's simultaneous key reporting.
7. With Wi-Fi disconnected, open administrator recovery, sign in locally, and type `exit` to confirm the kiosk returns. Then test the one-shot SD-card marker before relying on it for a broken web app.

References: [Raspberry Pi installation](https://www.raspberrypi.com/documentation/computers/getting-started.html), [Cage](https://github.com/cage-kiosk/cage), [NetworkManager](https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html), [Chromium policies](https://chromeenterprise.google/policies/), [systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html).
