# Stronghold Protocol: Alliance

An **unofficial fan remake** of *Arknights'* seasonal auto-chess tower-defense mode "Stronghold Protocol: Alliance": play instantly in the browser, solo or 1–4 player online co-op.

![version](https://img.shields.io/badge/version-0.1.1-2ea44f)
![license](https://img.shields.io/badge/code%20license-GPL--3.0--or--later-blue)
![node](https://img.shields.io/badge/node-22%20%7C%2024-339933)

## Disclaimer

> [!IMPORTANT]
> - This project is a player-made **unofficial fan work**. It has **no affiliation** with Shanghai Hypergryph Network Technology Co., Ltd. (Hypergryph), Yostar or their affiliates, and is not authorized or endorsed by them.
> - The names, characters, art, music, sound effects, text, data and other materials related to *Arknights* and "Stronghold Protocol" are copyright of their respective owners. These materials are **not** covered by this project's GPL-3.0 license; the GPL covers only the code written by this project itself.
> - For study, exchange and personal non-commercial use only. **Profiting from it in any form is strictly forbidden**, including but not limited to: selling this project or bundles of it, paid downloads or paid distribution, paid servers or paid hosting-for-hire, monetization via ads / donations / memberships, and any other commercial use.
> - The repository source does not include the game's art or audio assets (only data generated from the official data tables and a few screenshots, which are likewise not covered by the GPL); the bundles in [Releases](../../releases/latest) include assets for players' convenience, and downloading them is taken as acceptance of this disclaimer. Please do not use the assets for anything other than this project, or redistribute them separately. Full terms are in [NOTICE.md](NOTICE.md).
> - If a rights holder believes this project infringes their rights, please get in touch via an Issue and we will **remove** the relevant content immediately.
> - This project is provided "as is", **without any warranty**; use it at your own risk.

| Co-op room | Strategy draft | Rest phase (shop / alliances) |
|---|---|---|
| ![room](docs/img/room.jpg) | ![strategy](docs/img/band-draft.jpg) | ![rest phase](docs/img/prep.jpg) |
| **Facing wheel** | **Combat** | **Final Assault** |
| ![facing](docs/img/facing-wheel.jpg) | ![combat](docs/img/combat.jpg) | ![final assault](docs/img/final-assault.jpg) |

## Contents

- [Disclaimer](#disclaimer) · [Overview](#overview) · [Features](#features)
- [Quick start](#quick-start): [Bundle](#option-1-all-in-one-bundle-recommended) · [Run from source](#option-2-run-from-source) · [System requirements](#system-requirements) · [Ports and configuration](#ports-and-configuration) · [Play on a LAN](#play-with-friends-lan)
- [Connecting over the internet](#connecting-over-the-internet) · [Controls](#controls) · [Documentation](#documentation) · [Development and testing](#development-and-testing) · [Project structure](#project-structure)
- [License](#license) · [Credits and data sources](#credits-and-data-sources) · [Contributing](#contributing)

## Overview

"Stronghold Protocol: Alliance" is auto-chess + tower defense: during the rest phase you recruit operators, arrange your formation and fit gear at the Dispatch Center; during combat your operators deploy automatically and fight off the enemies pouring in from the red door, and enemies that leak through cost you Life Points. This project recreates that mode in the browser, keeping the rules and numbers as close to the official data tables and PRTS as possible.

- **Solo Simulation** (single player) and **Alliance Simulation** (1–4 player **co-op**, no PvP; empty seats can be filled with AI teammates).
- The server is a single Node.js program, and **combat is simulated in each player's browser** (just like the official game); the server only handles economy and rounds, so a low-power mini-PC is enough to host.
- Current version 0.1.1: fixes the issues players reported after the first public release (0.1.0); see [CHANGELOG.md](CHANGELOG.md) for details. A few rules are still implemented from inference — if anything differs from the official game, feedback via Issues is welcome.

## Features

- **A complete match**: confirm match info → strategy draft (40 strategies) → 14 rounds → settlement title; on Hazard and above, a 15th round "Hidden Core" appears when the conditions are met.
- **4 difficulties**: Standard / Hazard / Peril / Ultimate, each with its own parameters for solo and alliance play, all taken from the official data.
- **Rest phase**: recruit, refresh, freeze, upgrade the Dispatch Center; Reserve and Temporary Reserve; drag from the Reserve onto the board to deploy, choosing facing with the **facing wheel**. In Alliance Simulation the operator pool is shared.
- **Elite promotion**: 3 operators of the same name automatically merge into an Elite and grant one free recruit of the next tier up.
- **Operators and loadouts**: 112 recruitable operators (+ their Elites) with their skills, talents and traits; before a match you can choose the skill each operator carries (all 283 skills implemented by hand) and the Elite's module.
- **Alliances and layers**: 23 alliances (8 faction core alliances + add-on alliances), with layers kept for the whole match, up to 999 layers per alliance.
- **Gear and the draft**: equipment and arts, same-name gear merging, and specific combinations that grant alliance effects; equipped gear is locked to the operator. Some rounds begin with a draft pick (gear, funds, operators, layers, bounties, and so on).
- **Automatic combat**: skills fire automatically following the official "skill strategy"; blocking is by contact radius, and when a blocker falls an operator in contact takes over; elemental damage and elemental bursts; summons are placed by hand; knockback / pull are computed from force and weight; a knocked-down operator stays in place showing its redeploy countdown.
- **Terrain and enemies**: roadblocks, firing platforms, Originium-current blowers, swamps, exhaust grilles, rising tides and other terrain devices; airborne and low-hovering enemies, and bounty enemies.
- **Unite Phase**: when someone leaks enemies while someone else had a perfect combat, the teammate with the perfect combat brings their formation in to help intercept the leaked enemies.
- **Final Assault and Hidden Core**: two players share one battlefield and the whole team chips away at the same leader's health bar; 10 enemy leaders, a giant leader with a roughly 5×3-tile hit area, and the official damage-cap rule.
- **Settlement titles**: 6 titles such as Star of the Garrison, Immortal Alliance and Rock Solid.
- **Reconnection**: in Alliance Simulation, reopen the page within 10 minutes of a disconnect to return to your seat — your formation keeps fighting on its own while you are away, and you can also "step out" and hand over to an AI; in Solo Simulation you can come back within 24 hours (same browser).
- **Interaction details**: the top bar's target LP ticks down in real time as enemies leak (finalized at settlement); selecting, drag-and-drop and fitting gear all go by the tile on the ground; buying, upgrading and draft picks all take two clicks to confirm; with only one player, nothing is timed except combat.
- **Visuals and sound**: real Spine models, the official BGM and sound effects, emotes (6 sets × 6), and combat effects; an optional official 3D board (requires extracting textures from a local client).
- **Phone and desktop**: touch drag, long-press for details, landscape recommended; you can lower the quality in Settings.

## Quick start

### Option 1: All-in-one bundle (recommended)

The bundle already contains the code, runtime dependencies and all the art / audio (including the official 3D board textures) — unzip and play, with nothing else to download.

1. **Install Node.js 22 or 24 (LTS)**
   - Windows: run `winget install OpenJS.NodeJS.LTS` in PowerShell, or download an installer from <https://nodejs.org/en/download>.
   - macOS: `brew install node@22`, or download an installer from the official site.
   - Linux: your distro's package manager, nvm or fnm.
2. **Download**: on the [Releases](../../releases/latest) page download the latest version's (v0.1.1) bundle (zip) and unzip it to a folder with a short path (on Windows, avoid putting it in a OneDrive-synced directory).
3. **Launch**
   - Windows: double-click **`scripts\start-windows.bat`**. If a "security warning" pops up, click "Run"; if the Windows Firewall prompts, tick "Private networks" and allow it.
   - macOS / Linux: in the unzipped folder, run `./scripts/start.sh` (or `bash scripts/start.sh`).
4. A browser will open `http://localhost:3000` automatically. The LAN addresses listed in the window can be sent directly to friends on the same network. Closing the window (or pressing `Ctrl+C`) stops the server.

### Option 2: Run from source

```bash
git clone https://github.com/vietdoan0233/Stronghold-Protocol-ENG.git
cd Stronghold-Protocol-ENG
npm install        # install dependencies (postinstall copies pixi / preact / three into public/vendor)
npm run setup      # check the environment and download ~250 MB of art / audio from public mirrors (interruptible; re-running resumes)
npm start          # start the server: http://localhost:3000
```

**After the first setup**, you don't need `install` / `setup` again — to play, just start the server and open <http://localhost:3000>:

```bash
cd Stronghold-Protocol-ENG
npm start
```

You can also run the launch script directly (Windows `scripts\start-windows.bat`, macOS / Linux `scripts/start.sh`): the first run installs dependencies, downloads assets, then starts the server and opens the browser; later runs just start it and open the browser for you.

- The **official 3D board** requires extracting textures from a local *Arknights* PC client (the native Windows client, or CrossOver / PlayCover on macOS). When `npm run setup` detects a client it asks whether to extract (requires Python 3.8+, with dependencies installed inside the project's `.venv-extract`, leaving your system untouched); afterwards you can re-extract with `node tools/setup.mjs --local`, or point at a path with `--game "<…/StreamingAssets/AB/Windows>"`. Without a client, the 2D board is used automatically and nothing else is affected.
- Asset downloads prefer GitHub and fall back to the jsDelivr mirror on failure.
- `npm run doctor` (i.e. `node tools/doctor.mjs`) can diagnose things at any time: Node version, whether the assets are complete, port usage, LAN addresses and the firewall.

### System requirements

| Item | Requirement |
|---|---|
| Host PC | Windows / macOS / Linux, Node.js 22 or 24 (LTS); about 400–500 MB of disk (assets, dependencies and the optional locally extracted textures); about 100 MB of free memory, plus a few MB per match |
| Players | A modern browser with WebGL support (latest Chrome / Edge / Firefox / Safari), on a desktop, phone or tablet (landscape) |
| Network | On first entering the game, each player downloads a few tens of MB of assets from the host PC (served from the browser cache afterwards); in-match traffic is small |

On a weak GPU you can lower the quality in "Settings", or add `?board=2d` (force the 2D board) / `?render=fallback` (a simplified, non-WebGL view) to the URL.

### Ports and configuration

Listens on **TCP 3000** by default. To change the port: pass `--port 3001` to the launch script, or set the `PORT` environment variable.

| Environment variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Listening port |
| `HOST` | `0.0.0.0` | Listening address (`127.0.0.1` = local machine only; use this behind a reverse proxy) |
| `SP_COMBAT` | `client` | `client`: each player's browser simulates its own combat (very low server load); `server`: the server simulates and streams it |
| `SP_VERIFY` | `off` | Server re-checks client-reported combat results: `off` / `sample` (about 1/8 spot-checked) / `all` (re-check everything, more CPU) |
| `TRUST_PROXY` | `auto` | Whether to trust forwarding headers such as `X-Forwarded-For`: `auto` trusts only proxies from the local machine / private network; `1` always; `0` never |
| `DEBUG` | empty | Set to any value to output verbose logs |
| `SP_NO_BROWSER` | empty | Set to `1` to stop the launch script from opening the browser automatically |

How to set them: macOS / Linux `PORT=8080 npm start`; PowerShell `$env:PORT=8080; npm start`; cmd `set "PORT=8080" && npm start`. Health check: `GET /healthz`.

### Play with friends (LAN)

1. Open the page → enter a nickname → **Alliance Simulation** → create a room. The host picks the difficulty and can add / remove AI teammates.
2. Send friends the 4-letter **alliance key**, or the `http://<address>:3000/?room=KEY` link from "Copy link".
3. Once everyone clicks "Ready", the host starts.
4. Friends on the same Wi-Fi / router open an address listed in the launch window (something like `http://192.168.x.x:3000`). If it won't open, it's usually the firewall: on Windows, allow "Private networks" in the prompt at first launch, or run `npm run doctor` for the exact commands; guest Wi-Fi often has "AP isolation" on, which also blocks the connection.

After a refresh or a disconnect, reopening within 10 minutes (Alliance Simulation) or 24 hours (Solo Simulation) returns you to your seat. The server keeps rooms and matches in memory, so **restarting the server ends all matches**.

## Connecting over the internet

When friends aren't on the same LAN, here are some common approaches — pick whichever fits your situation. This is only a brief overview; the tools and services mentioned are just examples, this project has no relationship with them and does not endorse them, and you should follow each one's own documentation for installation, cost and usage rules. Deployment details (firewall, start-on-boot, reverse proxy and HTTPS, Docker) are in **[docs/DEPLOY.md](docs/DEPLOY.md)**.

| Approach | How | Good for |
|---|---|---|
| **Direct connection on the same LAN** | Send friends the LAN address from the launch window | The same home, dorm or internet café |
| **Mesh networking (virtual LAN)** | e.g. Tailscale, ZeroTier, EasyTier: the host and the friends all install the same tool and join the same network, and friends use the host PC's virtual IP to reach `http://<virtual IP>:3000` | A fixed group of acquaintances; not exposed to the public internet. Friends must install a client too, and some tools require an account; across regions it may route through a relay and slow down |
| **NAT traversal / tunneling** | Only the host runs a client, and friends just open a URL. E.g. a self-hosted frp (needs a server with a public IP), Cloudflare's `cloudflared tunnel --url http://localhost:3000` (a temporary address that changes each launch), or a public tunneling service | You don't want to touch the router and have no public IP; on a free low-bandwidth line the first asset load will be slower |
| **Cloud server / VPS deployment** | Run the bundle on a VPS, or use the repo's bundled `Dockerfile`; add HTTPS with Caddy / Nginx. Pick a region close to the players with a good line | Running a server long-term, with players in different regions |

General notes:

- The game is a **single long-running Node.js process + WebSocket** (path `/ws`); only one instance can run, and it must be deployed at the root path of a domain. Serverless platforms like Vercel and static hosts like GitHub Pages are not suitable. The reverse proxy must forward the WebSocket upgrade.
- The game has no account system, so **anyone who knows the address can get in**. Only send the address to friends, don't post it publicly, and don't run a public lobby; this also reduces asset-copyright risk.
- With a public IPv4 you can also set up port forwarding on the router, but that exposes your home PC directly to the internet — prefer the approaches above.

## Controls

| Action | How |
|---|---|
| Buy / upgrade the Dispatch Center / draft pick | Click once to select, click again to confirm (`D` to upgrade) |
| Deploy / move an operator | Drag from the Reserve to a board tile → the facing wheel appears → swipe up / right / down / left to pick a facing, then release; release at the center or click "✕ click to cancel" to cancel. While dragging, the model stays under the pointer / finger, and the tile under the pointer is the drop target |
| Change facing | Drag the operator back onto its own tile, then pick a facing |
| Sell / retreat / destroy gear | Click the unit's tile → the bottom buttons "Sell +1" / "Retreat"; you can also drag a board operator back to the Reserve to retreat. Gear and arts in the Reserve can only be "destroyed", and equipped gear is locked to the operator (returned to the Reserve when the operator is sold or merged into an Elite) |
| Equip | Drag gear onto the operator's tile (2 per operator; when full, a replace dialog pops up and the replaced piece is destroyed); drag arts onto a tile and pick a facing |
| View details | Right-click or long-press a unit / card (stats are live values — green when above the base value, red when below) |
| Shortcuts | `R` refresh · `F` freeze · `D` upgrade · `Space` ready · `Esc` cancel / close |
| Facing wheel, keyboard | Arrow keys to preview · `Enter` to confirm · `Esc` to cancel |
| Pause (Solo Simulation) | During combat (including the Final Assault / Hidden Core) click "Pause" in the top bar or press `Space`, then click "Resume combat" (or `Space`) to continue; combat in Alliance Simulation cannot be paused |
| Emotes | "Chat" at the bottom left; swipe left / right (or arrow keys) to change the set, 1-second cooldown |
| Spectate | After your own combat ends (or during the rest phase), click a teammate's portrait on the left → "Go watch" |

The full rules, numbers and tips are in **[docs/PLAYING.md](docs/PLAYING.md)** (also available in-game via "How to play" at the bottom left).

## Documentation

| Document | Contents |
|---|---|
| [CHANGES.md](CHANGES.md) | English-localization notes: terminology, the code-vs-display name split, and what is / isn't translated yet (this is an English fork of a Chinese project) |
| [CHANGELOG.md](CHANGELOG.md) | Change log: what each version fixed, and which pieces of feedback turned out not to be bugs |
| [docs/PLAYING.md](docs/PLAYING.md) | Gameplay guide: flow, economy, recruiting and promotion, formation, the Unite Phase, alliances, the Final Assault, settlement titles |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Deployment guide: hosting and start-on-boot on Windows, firewall, mesh networking / tunneling, reverse proxy and HTTPS, Docker, systemd, troubleshooting |
| [docs/DESIGN.md](docs/DESIGN.md) | Architecture and contracts: tech stack, directory responsibilities, network protocol, rendering and UI, and the rule revisions after each playtest |
| [docs/SIM.md](docs/SIM.md) | Combat simulation engine reference: hooks, skill-description format, profession defaults |
| [docs/META.md](docs/META.md) | Match and economy engine: round flow, shop, the Unite Phase, and Final Assault implementation details |
| [docs/DATA.md](docs/DATA.md) | The game data generated from the official data tables |
| [docs/ASSETS.md](docs/ASSETS.md) | Asset sources, directory structure and the manifest |
| [docs/BALANCE.md](docs/BALANCE.md) | The difficulty model and measurements |
| [docs/research/](docs/research/00-INDEX.md) | Research notes on the official rules, data and UI |

## Development and testing

```bash
npm run dev                 # node --watch: auto-restart the server after code changes
node --test                 # unit + integration tests (~3,170; cases needing assets / a browser skip automatically)
SP_E2E=1 node --test test/ui/mock.e2e.test.js        # browser end-to-end tests, needs a local Chrome (CHROME_PATH can point at it)
SP_REAL_E2E=1 node --test test/ui/real.e2e.test.js   # needs Chrome + downloaded assets
RENDER_E2E=1 node --test 'test/render/*.browser.test.js'   # render tests, some need locally extracted board textures
```

- The game data is generated by `npm run build-data` (`tools/build-data.mjs`) from the official data tables — do not edit `data/*.json` by hand.
- GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `npm ci`, `node --test` and a server smoke test on Ubuntu and Windows, Node 22 / 24.

## Project structure

| Path | Contents |
|---|---|
| `server/` | Node HTTP static serving + WebSocket (`/ws`), lobby, match engine (`match/`), combat simulation (`sim/`, shared by browser and server) |
| `shared/` | Constants and the network protocol shared by client and server |
| `public/` | The browser client (native ES modules, PixiJS + pixi-spine, three.js 3D board, Preact + htm UI) |
| `data/` | The game data generated from the official data tables, and the asset manifest `assets.json` |
| `tools/` | `setup.mjs` / `doctor.mjs`, asset download `fetch-assets.mjs`, data build, local extraction `local-extract/` |
| `scripts/` | Launch scripts (Windows / macOS / Linux), Windows start-on-boot |
| `docs/` | Documentation and research |
| `test/` | `node:test` tests |

## License

- **Code**: the code written by this project itself is released under **GPL-3.0-or-later**; see [LICENSE](LICENSE) for the full text, plus an additional permission under GPL section 7 allowing combination and distribution with the Spine Runtimes in pixi-spine (see [NOTICE.md](NOTICE.md)).
- **Game assets are not covered by the license**: the *Arknights* art, music, sound effects, text and data are copyright of their respective owners, are not covered by the GPL, and their usage restrictions are in the [Disclaimer](#disclaimer) above and in [NOTICE.md](NOTICE.md).
- **Third-party components** each follow their own license: the libraries installed via npm (the bundle's `node_modules` includes each one's license file), the algorithm in `tools/local-extract/aklz4.py` (BSD-3-Clause), fonts, and so on; the full list and license texts are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Credits and data sources

- Game data: [Kengxxiao/ArknightsGameData](https://github.com/Kengxxiao/ArknightsGameData).
- Asset sources: [yuanyan3060/ArknightsGameResource](https://github.com/yuanyan3060/ArknightsGameResource), [fexli/ArknightsResource](https://github.com/fexli/ArknightsResource), [isHarryh/Ark-Models](https://github.com/isHarryh/Ark-Models), [ArknightsAssets/ArknightsAssets2](https://github.com/ArknightsAssets/ArknightsAssets2); fonts from [TimWangZi/The-font-of-Arknights](https://github.com/TimWangZi/The-font-of-Arknights) and Google Fonts (Noto Sans SC). See [docs/ASSETS.md](docs/ASSETS.md) for details.
- Rule-checking reference: [PRTS Arknights Chinese Wiki](https://prts.wiki/).
- LZ4AK unpacking: the algorithm in `tools/local-extract/aklz4.py` comes from [isHarryh/Ark-Unpacker](https://github.com/isHarryh/Ark-Unpacker) (BSD-3-Clause, via MooncellWiki/UnityPy); parsing Unity assets uses [UnityPy](https://github.com/K0lb3/UnityPy) (MIT).
- Libraries: [PixiJS](https://pixijs.com/) (MIT), [pixi-spine](https://github.com/pixijs/spine) (MIT; the Spine Runtime it contains is additionally subject to the [Spine Runtimes License](https://esotericsoftware.com/spine-runtimes-license)), [three.js](https://threejs.org/) (MIT), [Preact](https://preactjs.com/) + [htm](https://github.com/developit/htm) (MIT), [ws](https://github.com/websockets/ws) (MIT).

Thanks to the authors and maintainers of the projects above, and to Hypergryph for bringing us this game.

## Contributing

Issues reporting bugs, discrepancies with the official rules or suggestions for improvement are welcome, as are Pull Requests:

- Before submitting, please run `node --test` and update the relevant docs; documentation and code and comments are all in English.
- Submitted code will be released under GPL-3.0-or-later.
- Please do not commit any game asset files (directories such as `public/assets/` are already excluded by `.gitignore`).
- This project stays non-commercial: please do not submit any form of monetization feature such as ads, paywalls or donations.
