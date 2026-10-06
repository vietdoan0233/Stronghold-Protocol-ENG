# Deployment guide

This guide covers a source install on a home Windows mini-PC and equivalent hosting options for other platforms.
All commands are run from the project root. When something goes wrong, run `node tools/doctor.mjs` first (read-only diagnostics).

## 0. Resource needs

| Item | Description |
|---|---|
| Server CPU | Combat is simulated in each player's browser (DESIGN §14); the server only handles rounds, economy and verification: **about 1 ms CPU per room per combat round**. Battlefields for AI teammates / disconnected players are simulated by the server: at the start of combat, 3 AI battlefields take about 0.2–0.5 s CPU on a dev machine, and possibly a few seconds on a mini-PC (run in 8 ms slices, so other rooms don't stall). `SP_VERIFY=all` re-checks every human battlefield, raising CPU noticeably; on a mini-PC prefer `off` or `sample`. |
| Server memory | About 100 MB idle, plus a few MB per match in progress. |
| Network | In a 4-player match the server sends about 0.25 MB down per round (measured, DESIGN §14). On first entering the game the browser downloads the needed images / Spine models / audio from the host (loaded on demand, then served from the browser cache), and the first load is slower over a low-bandwidth public tunnel. |
| Disk | Downloaded assets about 270 MB (`public/assets`) + dependencies about 125 MB (`node_modules`); the optional local extraction is about 40 MB (`.venv-extract`) + 70 MB of textures. |
| Player device | A modern browser with WebGL support (latest Chrome / Edge / Firefox / Safari), on a desktop, phone or tablet (landscape). Older devices can lower the quality in Settings or visit `/?board=2d`. |

The server is **stateless**: rooms and matches live only in memory, with no database or save files, so **no backup is needed**. Restarting the server ends matches in progress (including a Solo Simulation that could otherwise be resumed within 24 hours after a disconnect).

## 1. Windows mini-PC: step by step

### 1.1 Install and first launch

1. Install Node.js 22 or 24 (LTS) and Git:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   winget install Git.Git
   ```
   After installing, close and reopen the terminal; `node -v` should show v22 or v24. Without winget, use the official installers at <https://nodejs.org/en/download> and <https://git-scm.com/download/win>.
2. Clone this English edition into a fixed, short directory outside OneDrive sync, such as `C:\Stronghold-Protocol`:
   ```powershell
   git clone https://github.com/vietdoan0233/Stronghold-Protocol-ENG.git C:\Stronghold-Protocol
   ```
   There is no published English release bundle yet. You can build one locally with `node scripts/make-windows-bundle.mjs` if the required assets are available; source install is the supported route.
3. Double-click `C:\Stronghold-Protocol\scripts\start-windows.bat`. The first run installs dependencies, copies browser libraries, downloads about 270 MB of assets (resuming if interrupted), optionally offers to extract local-client art, then starts the server and opens the browser.
4. The window prints an address friends can use, such as `http://192.168.1.23:3000`. Open it on another device to confirm it works. Closing the window stops the server.

The equivalent manual commands are `npm ci`, `node tools/setup.mjs`, then `npm start`.
### 1.2 Firewall

- On the first launch Windows shows a "Windows Security Alert": tick **Private networks** and click "Allow access".
- If no prompt appeared or you clicked the wrong option, add a rule from an **admin** PowerShell (the start-on-boot script below also adds it automatically):
  ```powershell
  netsh advfirewall firewall add rule name="Stronghold Protocol" dir=in action=allow protocol=TCP localport=3000 profile=private,domain
  ```
- If your home network is a "Public network", Windows blocks inbound connections. Change it to private (admin PowerShell; find the adapter name with `Get-NetConnectionProfile`):
  ```powershell
  Set-NetConnectionProfile -InterfaceAlias "Ethernet" -NetworkCategory Private
  ```
- `node tools/doctor.mjs` shows whether the rule exists, each network's type, and the addresses friends can use.

### 1.3 Fix the LAN IP (recommended)

If the host's IP changes, the address friends bookmarked stops working. It's best to bind the mini-PC's MAC address to a fixed IP (such as `192.168.1.50`) under "DHCP reservation / address reservation" in your **router's** admin page. You can also set it by hand in Windows under "Settings → Network & Internet → Properties → IP assignment → Edit" (IP, subnet mask, gateway and DNS matching the router, and not conflicting with another device).

### 1.4 Run automatically in the background at boot

First close the `start-windows.bat` window (otherwise the port conflicts), then run this in the project directory (it requests admin rights automatically):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1
```

It will: run `tools/setup.mjs` once → write the settings into `scripts\service.env.cmd` (node.exe path, port, etc.) → register the scheduled task **StrongholdProtocol** (runs `scripts\run-server.cmd` as SYSTEM 20 seconds after boot, with no login needed; auto-restarts 5 seconds after the server exits) → add the firewall rule → start immediately and show the status. Logs are in `logs\server.log` (auto-rotated past 10 MB).

| Need | Command (all appended after `powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1`) |
|---|---|
| Change port / other settings | `-Port 8080`, `-Verify sample`, `-Combat server`, `-BindHost 127.0.0.1` (for a reverse proxy only) |
| Allow public networks too | `-AllowPublicNetwork` (usually not needed; may be needed when a Tailscale adapter is recognized as a public network) |
| Show status and recent logs | `-Status` |
| Restart (after updating code) | `-Restart` |
| Stop | `-Stop` (it still starts automatically at the next boot) |
| Uninstall | `-Uninstall` (removes the scheduled task, the firewall rule and `service.env.cmd`) |

It's also a good idea to disable sleep, otherwise the mini-PC hibernates when idle: `powercfg /change standby-timeout-ac 0`.

<details>
<summary>Alternative: register it as a real Windows service with NSSM</summary>

```powershell
winget install NSSM.NSSM            # or download from https://nssm.cc
nssm install StrongholdProtocol "C:\Program Files\nodejs\node.exe" server\index.js
nssm set StrongholdProtocol AppDirectory C:\Stronghold-Protocol
nssm set StrongholdProtocol AppEnvironmentExtra PORT=3000 HOST=0.0.0.0
nssm set StrongholdProtocol AppStdout C:\Stronghold-Protocol\logs\server.log
nssm set StrongholdProtocol AppStderr C:\Stronghold-Protocol\logs\server.log
nssm start StrongholdProtocol
```

The firewall rule still has to be added by hand per 1.2. Use only one of the two methods.
</details>

### 1.5 Updating

```powershell
cd C:\Stronghold-Protocol
powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1 -Stop   # when start-on-boot is installed
git checkout -- data/assets.json    # the asset manifest is regenerated by setup; restore it first so git pull doesn't conflict
git pull
npm ci
node tools/setup.mjs                # download any newly added assets (existing files are skipped)
powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1 -Restart
```

Without start-on-boot, make the last step double-clicking `start-windows.bat` again. For upstream source updates, follow the merge workflow in [docs/UPSTREAM.md](UPSTREAM.md) so Chinese game data and the English locale overlays remain easy to merge.

## 2. Letting friends on another network join

### 2.1 Tailscale / ZeroTier (recommended for a home mini-PC)

Form a virtual LAN: no public IP, no router changes, and not exposed to the internet.

- **Tailscale**: the host and friends all install <https://tailscale.com/download> (Windows: `winget install Tailscale.Tailscale`) and log in. When friends use their own accounts, "Share" this host to them in the Tailscale admin console, or invite them to your tailnet. Friends visit `http://<the host's 100.x.y.z address>:3000` (find it with `tailscale ip -4`; with MagicDNS on you can also use `http://<hostname>:3000`).
- **ZeroTier**: create a network at <https://my.zerotier.com>, have the host and friends install the client and join the same Network ID, and authorize members in the console; visit `http://<the host's ZeroTier IP>:3000`.
- When you can't connect, run `node tools/doctor.mjs`: check whether Windows recognizes the VPN adapter as a "Public network", and if so change it to private per 1.2, or add `-AllowPublicNetwork` when installing start-on-boot.

### 2.2 cloudflared temporary tunnel (friends install nothing)

```powershell
winget install --id Cloudflare.cloudflared      # macOS: brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

Send friends the `https://xxxx.trycloudflare.com` it prints. When the page is https the client switches to `wss://` automatically, with no configuration needed; the server identifies the real origin via the tunnel-forwarded `CF-Connecting-IP` (`TRUST_PROXY=auto`). A temporary tunnel gives a different address each launch and has no uptime guarantee; for a fixed address, use a "named tunnel" with a Cloudflare account + your own domain.

### 2.3 Router port forwarding

Only when you have a **public IPv4** (many broadband lines are behind carrier-grade NAT with no public IP, in which case use 2.1 / 2.2):

1. First fix the host's LAN IP per 1.3.
2. In the router's "Virtual server / Port forwarding": external port 3000 (or any port) → internal `host-IP:3000`, TCP.
3. Friends visit `http://<your public IP>:external-port`.

Note: the game has no account system, so anyone who knows the address can get in. The server has a per-network limit on connections from the internet (at most 64 connections per network, with caps on the number of rooms / matches too), but it's still better to turn forwarding off when not playing, or prefer Tailscale.

### 2.4 Reverse proxy and HTTPS (with a domain)

It must be deployed at the **root path of a domain** (the client uses absolute paths like `/data/`, `/vendor/`, `/ws`, and does not support running under a sub-path). The proxy must forward the WebSocket upgrade (path `/ws`). It's best to have the server listen on localhost only: `HOST=127.0.0.1` (Windows start-on-boot: `-BindHost 127.0.0.1`).

**Caddy** (requests HTTPS certificates automatically, WebSocket needs no extra config):

```caddy
game.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

**Nginx**:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
server {
    listen 443 ssl;
    server_name game.example.com;
    ssl_certificate     /etc/letsencrypt/live/game.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/game.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 1h;      # long-lived WebSocket connection
    }
}
```

On https / wss: when the page is opened over https the client connects to `wss://same-domain/ws` automatically; over http it uses `ws://`. The server itself serves only http, and the certificate is handled by the proxy / tunnel. When the proxy and the server are on the same machine or private network, `TRUST_PROXY=auto` trusts its `X-Forwarded-For` / `X-Real-IP`; when the proxy is on another machine on the public internet, set `TRUST_PROXY=1` (and make sure the game port is open only to the proxy).

## 3. Docker

```bash
# A) download assets at build time (needs internet, about 270 MB)
docker build -t stronghold-protocol --build-arg FETCH_ASSETS=1 .
docker run -d --name stronghold -p 3000:3000 --restart unless-stopped stronghold-protocol

# B) don't bake assets into the image: run node tools/setup.mjs on the host first, then mount
docker build -t stronghold-protocol .
docker run -d --name stronghold -p 3000:3000 --restart unless-stopped \
  -v "$PWD/public/assets:/app/public/assets:ro" stronghold-protocol
```

The image is based on `node:22-alpine`, multi-stage, with production dependencies only; `public/vendor` is generated at build time. `.dockerignore` excludes `public/assets` (so host assets aren't pulled into the build context); `public/fonts`, `data/assets.json` and `data/local-assets.json` are copied in if present. Environment variables are the same as in the README (`-e SP_VERIFY=sample`, etc.). Health check: `GET /healthz`.

docker compose example:

```yaml
services:
  stronghold:
    build:
      context: .
      args: { FETCH_ASSETS: "1" }
    ports: ["3000:3000"]
    restart: unless-stopped
    environment:
      SP_VERIFY: "off"
```

## 4. Running long-term on macOS / Linux

- Temporary hosting: `scripts/start.sh` (or `npm start`), keeping the terminal window open. On macOS the first run asks whether to allow node to accept incoming connections — choose "Allow".
- Linux systemd (`/etc/systemd/system/stronghold.service`, with the path and user adjusted to your setup):

  ```ini
  [Unit]
  Description=Stronghold Protocol game server
  After=network-online.target
  Wants=network-online.target

  [Service]
  WorkingDirectory=/opt/Stronghold-Protocol
  ExecStart=/usr/bin/node server/index.js
  Environment=PORT=3000 HOST=0.0.0.0
  Restart=always
  RestartSec=5
  User=stronghold

  [Install]
  WantedBy=multi-user.target
  ```

  `sudo systemctl daemon-reload && sudo systemctl enable --now stronghold`; logs `journalctl -u stronghold -f`; firewall `sudo ufw allow 3000/tcp`.

## 5. Troubleshooting

| Symptom | What to do |
|---|---|
| Any problem | `node tools/doctor.mjs`: Node version, dependencies, asset integrity, port, LAN addresses, firewall, network type |
| `port already in use / EADDRINUSE` | A server is already running (a start-on-boot task?) or another program is using 3000: change the port with `scripts\start-windows.bat --port 3001` |
| Friends can't open the page | Firewall rule / network type (1.2); confirm they're using the `LAN` address, not `localhost`; guest Wi-Fi often has "AP isolation" on; if not on the same network, see section 2 |
| Placeholder images, no sound | Assets didn't finish downloading: re-run `node tools/setup.mjs` (it resumes); the missing details are in `.cache/assets-report.json`. When the GitHub raw address fails it switches to the jsDelivr mirror automatically |
| Asset download is slow / fails | Network issues can be interrupted at any time, and re-running skips finished files; `node tools/fetch-assets.mjs --concurrency=4` lowers the concurrency. When some files didn't download, the asset manifest `data/assets.json` stays unchanged (the script lists the missing entries and exits non-zero; in-game a missing image uses a placeholder and a missing sound doesn't play), so just re-run to top it up |
| Emotes or How to Play pages are missing | Run `node tools/setup.mjs` to download mirror assets; rerun setup to retry files that failed |
| Local extraction fails | The game still runs with its 2D board and replacement art. Confirm the client has downloaded all its resources; when a too-new Python version breaks dependency installation, install Python 3.12, delete `.venv-extract`, then run `node tools/setup.mjs --local` |
| The 3D board doesn't appear | Needs locally extracted board textures (`node tools/doctor.mjs` shows "3D board available") and a browser that supports WebGL2 |
| Disconnected | Reopen the page in the same browser within 10 minutes (Alliance Simulation) or 24 hours (Solo Simulation, `config.constants.singleReconnectTime`) to return to your seat automatically. While an alliance seat is dropped it fights automatically with its existing formation and readies up on time (nothing is bought for you; to let an AI play, use "Leave simulation → Step out (AI takeover)"); a Solo Simulation is untimed and waits for you to return |

## 6. Optional local-client art

The game works without a local Arknights client. Normal setup downloads the 36 battle emotes and 19 How to Play pages from the public mirror. If setup detects a compatible PC client, it can optionally extract the official 3D board textures, selected UI icons, and enemy models unavailable from the public asset sources. Without those local files, the board uses the 2D renderer and selected art uses replacements.

If another compatible installation already has these optional files, copy both `public/assets/local/` and `data/local-assets.json` together. The manifest references files under that directory; copying only one side leaves local assets incomplete. See [docs/ASSETS.md](ASSETS.md) for asset paths and fallback behavior.

**3D board texture downloads:** Each player downloads 12 textures from the host when entering a match. Extraction now writes a WebP for each texture (lossy color maps at quality 95; lossless normal and data maps). The manifest points to WebP files; same-name PNGs remain for the crop tool and setup. This cuts the download from about 6.7 MB to about 2 MB, especially helping remote players on slower connections. To add WebP files to local assets extracted before this change, run `tools/local-extract/extract.py --webp` in the existing extraction Python environment. Pillow is sufficient; the game client is not needed.
