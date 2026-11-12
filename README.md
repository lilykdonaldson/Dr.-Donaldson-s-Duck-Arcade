# Dr. Donaldson's Duck Arcade

A keyboard-controlled student arcade with pixel ducks, a game collection, individual game information screens, and offline playback of both Game Lab examples and Chase the Pizza.

## Run the arcade

With Node.js installed, run this from the project folder:

```sh
node server.cjs
```

Open [the arcade homepage](http://127.0.0.1:8080/) in Chrome, Edge, or Chromium. Keep the terminal open. Stop the server with Ctrl+C. The server accepts connections only from this computer. Node.js 18 or newer is required.

No npm installation or internet connection is required to play any of the included games. Fonts, jQuery, game assets, and the MakeCode simulator are stored locally. Do not open the HTML by double-clicking it; games load through the local server.

- Opening: Space to start.
- Collection: any arrow key chooses a game; Space opens its information screen.
- Information: arrows choose Exit or Play; Space selects. Play is selected initially.
- X-Y Game Lab game: arrows move. Jumping Game Lab game: Space jumps.
- MakeCode: arrows move the pizza. Space maps to A; the example assigns no special action to A.
- Hold all four arrows continuously for three seconds to unload the game and return to the collection. Releasing any arrow cancels the countdown.
- Mouse clicks also work. Enter is an alternative to Space in menus. Escape backs out of menu screens. The header returns to the opening screen.

Games restart fresh each time they open. Game Lab canvases scale from 400 × 400; MakeCode's 160 × 120 screen keeps its 4:3 proportions inside a square frame.

## Raspberry Pi kiosk

For the dedicated cabinet with password-protected maintenance, Wi-Fi controls, shutdown/restart, local administrator recovery, GitHub updates, and a restricted student session, follow [the fresh Pi installation guide](pi/SETUP.md). It targets Raspberry Pi OS Lite (64-bit) and supersedes the basic desktop launch instructions below. Maintenance opens with **Ctrl+Alt+M**, then your password. The installer asks for that password on the Pi; it is not stored in Git. SSH is optional: repairs can use a USB keyboard and the Pi's monitor, with a one-shot SD-card fallback if the web app cannot load.

The following basic script is useful for a desktop preview but does not provide the dedicated cabinet's OS lockdown or management services.

For a local maintenance preview, run `node scripts/set-admin-password.cjs` in an interactive terminal to create the ignored `.local-admin.json`. Then set `ARCADE_PASSWORD_FILE` to that file's absolute path and run `node maintenance/server.cjs`. The login panel appears at `http://127.0.0.1:8082/`. Actual device actions require the Pi installer and are unavailable on Windows. No password is preconfigured or stored in Git.

Use Raspberry Pi OS with a desktop, Node.js 18+, and Chromium. Install these during setup while internet access is available, then copy the entire project folder to the Pi. From that folder, run:

```sh
bash scripts/launch-kiosk.sh
```

This starts the server and opens Chromium full screen using a separate browser profile under `.kiosk-profile/`. Run it as your normal desktop user. Close the kiosk with Alt+F4 on an administrative keyboard; the launcher then stops its server. If port 8080 is already in use, stop the earlier server or set a different `PORT` before launching.

For automatic startup on a Pi desktop using labwc, add this line to the existing `~/.config/labwc/autostart`, using the project's actual absolute path:

```sh
bash "/home/YOUR_USER/duck-arcade/scripts/launch-kiosk.sh" &
```

Preserve existing entries. Configure desktop auto-login and disable screen blanking in Raspberry Pi settings for a dedicated cabinet. See [Raspberry Pi's official kiosk guide](https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/) for labwc setup. Older desktop environments may use another autostart location.

## Add or edit games

Edit `games.json` to change names, descriptions, author credits, controls, and local paths. Chase the Pizza's author is still marked for confirmation. Each entry populates its card and information screen.

For another Game Lab export, preserve its folder structure, use local jQuery, and include `arcade-input.js` with the correct relative path. This bridge forwards arrow events while the game has focus. The included exports hide mobile controls and align their canvases to the square frame.

MakeCode entries point to the local player index.html. The kiosk loads `built.json` and `runtime/simulator.html` from that folder. Include the local `controls.js` bridge in the simulator, as in this example. The isolated [MakeCode test player](http://127.0.0.1:8080/Games/Chase%20the%20Pizza/) remains available.

## Offline package

`Games/Chase the Pizza/` contains the original PNG and decoded project under `source/`, the compiled simulator program in `built.json`, and downloaded Microsoft simulator assets under `runtime/`. The runtime manifest records download URLs and SHA-256 checksums; Microsoft license notices are included. The project lists the `kiki-lee/chase-the-pizza` asset-pack dependency, which MakeCode resolves during preparation. Student author credit still needs confirmation.

The game runs entirely from these files. It does not rely on browser caches, the shared-project website, or an installed MakeCode editor. The local-server policy blocks external connections. The pizza menu artwork comes from the supplied sprite; ducks are custom SVG pixel art. The pixel font's OFL license is included under `assets/`.

To prepare this example again from a revised PNG, while online:

```sh
npm install
npx playwright install chromium
npm run prepare:makecode -- "/path/to/arcade-Chase-the-Pizza.png"
npm test
```

The preparation script currently targets this example's folder. It decodes the PNG, uses MakeCode's online compiler, then saves the compiled result and local simulator dependencies. Test after rebuilding; preparation needs internet but normal playback does not. To use an existing Chrome installation instead of Playwright's browser, set `ARCADE_BROWSER_CHANNEL=chrome` in the environment.

## Verification and remaining work

Automated Chrome tests use fresh profiles, disable service workers, and block external requests. They verify opening/menu/info navigation, launching all three games, Game Lab movement and jumping, MakeCode movement and Space/A input, cancelled exit holds, the three-second exit in every game, unloading, replay, and a narrow layout. Screenshots are saved under `test-results/`.

All three games passed in Windows Chrome with zero external requests and no runtime or console errors. The Pi script passed a bash syntax check. Actual Pi 4 performance, audio, display setup, and physical controls remain to be tested. The keyboard or USB encoder must report four simultaneous arrows. A conventional single joystick cannot physically engage opposing directions; the return gesture needs suitable independent controls.

The Game Lab exports now use local jQuery and the kiosk's input bridge; their game code and assets are preserved.

