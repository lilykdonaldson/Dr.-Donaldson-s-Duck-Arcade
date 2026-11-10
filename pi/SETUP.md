# Install the Raspberry Pi cabinet

Target: a fresh **Raspberry Pi OS Lite (64-bit)** image on the Pi 4. Lite is intentional: Cage runs Chromium without a desktop, panel, or file manager behind the arcade. The installer changes login, Chromium policy, and console settings on a dedicated Pi. It does not reformat an SD card or configure this Windows computer.

## Prepare and install

1. Use Raspberry Pi Imager to write Raspberry Pi OS Lite (64-bit). Set hostname `duck-arcade`, your own administrator username/password, Wi-Fi country and setup network, and keyboard layout. Enable SSH, preferably with your computer's public key.
2. Boot the Pi. Connect Ethernet if possible. SSH from your computer with `ssh YOUR_ADMIN@duck-arcade.local`, or use the Pi's IP address. Keep this administrator login separate from the maintenance password.
3. **Commit and push the prepared app and game files to GitHub first.** The installer uses committed files from `main`, including Game Lab exports and the MakeCode `built.json` and runtime. It cannot install this computer's uncommitted changes. No changes have been pushed automatically during this work.
4. Run the following in your Pi SSH session:

```sh
sudo apt update
sudo apt install -y git
git clone https://github.com/lilykdonaldson/Dr.-Donaldson-s-Duck-Arcade.git ~/duck-arcade-setup
cd ~/duck-arcade-setup
sudo bash pi/install.sh
```

Create a maintenance password of at least 12 characters when prompted. Input is hidden; only its salted hash is stored at `/etc/duck-arcade/admin.json`, outside Git. Keep it in your password manager.

The installer installs the runtime and services, then validates the first release before enabling the restricted session. If it fails, resolve the error via SSH before rebooting. The current installer uses a public GitHub HTTPS repository and branch `main`; private-repository credentials require separate administrator configuration. Never embed access tokens in URLs or game files.

When installation completes, run `sudo reboot`. Keep SSH recovery available during the first boot and acceptance checks. The Pi should show the duck opening screen. Setup and updates need internet; normal gameplay and local maintenance login do not.

## Student mode

Cage displays the browser without a normal desktop. Its console-switching option is disabled. Closing Chromium launches it again. The student account has no sudo access; browser policies restrict external destinations, developer tools, file dialogs, downloads, printing, and extensions. Console switching and Ctrl+Alt+Delete are disabled for this installation.

This protects ordinary classroom keyboard use. Physical access to the SD card, boot media, or cabinet internals can bypass OS restrictions, so protect those physically. Confirm the lockdown checks below on your actual device before student use.

## Maintenance

Connect an administrator keyboard and press **Ctrl+Alt+M** in any menu or game, then enter the maintenance password. The game stops before the maintenance screen opens. The panel includes:

- Current version, uptime, active network, IP addresses, and GitHub DNS/TCP reachability.
- Wi-Fi enable, scan, and connection for open and WPA/WPA2 personal networks.
- Update from GitHub and restore the previous installed release.
- Restart and safe shutdown with confirmation.
- Lock and return to the arcade, plus automatic locking after five minutes of inactivity.

Wi-Fi passwords go to NetworkManager over D-Bus, without shell arguments or helper logs. Saved credentials are stored by NetworkManager's normal system configuration. WPA3-only, school enterprise/802.1X Wi-Fi, and captive portals require administrator configuration via SSH/Ethernet. `sudo nmtui` provides a terminal network setup interface. If Wi-Fi fails, the local panel still works; Ethernet provides recovery access.

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

## Recovery and architecture

| Component | Account | Address / path |
| --- | --- | --- |
| Launcher | duckweb | 127.0.0.1:8080 |
| Sandboxed games | duckweb | 127.0.0.1:8081 |
| Maintenance | duckmaint | 127.0.0.1:8082 |
| Repository updater | duckupdate | /var/lib/duck-arcade/repo |
| Active / previous release | updater-owned links | /opt/duck-arcade/current, /opt/duck-arcade/previous |
| Fixed device helper | root-owned | /usr/local/libexec/duck-arcade-control |

Services bind only to loopback. Student games have a separate origin, sandbox restrictions, and no maintenance token or sudo permission. Only the maintenance service may invoke the fixed-action helper. Runtime secrets and private repository files are not served by the static server.

Reset a forgotten maintenance password using your separate SSH administrator login:

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

Stop the screen for repairs with `sudo systemctl stop greetd` over SSH. Resume with `sudo systemctl start greetd`. The Lite installation has no normal desktop to expose. Do not lose the SSH administrator credentials.

## Acceptance checks before classroom use

Automated Windows tests cover UI authentication, expiry, confirmation, game-origin separation, maintenance-key forwarding, gameplay, and release validation. Python tests exercise helper routing and password handling without real device actions. Shell scripts have syntax checks. Linux boot, NetworkManager, power actions, effective Chromium policies, and Git release activation still need testing on the Pi.

1. Cold boot offline. Play all three games and test the four-arrow home shortcut and audio.
2. Check Alt+F4 reopens Chromium; F11, Ctrl+L, Ctrl+O, F12, Ctrl+Shift+I, Ctrl+Alt+F2, and Ctrl+Alt+Delete must not expose a desktop, files, terminal, or another website. Verify effective policies during administrator setup.
3. Open maintenance from each game. Check wrong passwords fail, inactivity locks, and returning to games clears the session.
4. Scan and reconnect to real Wi-Fi; test Ethernet recovery and a disconnected boot.
5. Install a valid update, reject an invalid game manifest, and restore the previous release. Ensure an active game is not interrupted.
6. Confirm restart returns to the arcade and shutdown completes safely. Test the actual button encoder's simultaneous key reporting.

References: [Raspberry Pi installation](https://www.raspberrypi.com/documentation/computers/getting-started.html), [Cage](https://github.com/cage-kiosk/cage), [NetworkManager](https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html), [Chromium policies](https://chromeenterprise.google/policies/), [systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html).
