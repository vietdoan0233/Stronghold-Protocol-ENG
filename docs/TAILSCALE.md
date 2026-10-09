# TAILSCALE.md — playing with friends on other networks (English)

A short host-and-friends guide for playing over [Tailscale](https://tailscale.com/), a private virtual network (a "tailnet").
Nobody has to open a router port, and the game is not exposed to the public internet. The longer overview of every
option (LAN, mesh VPNs, tunnels, reverse proxy) is in [DEPLOY.md](DEPLOY.md) section 2. The game has no account system:
anyone who can reach the address can join, which is why a private tailnet is the recommended way.

## 1. Host: install and start

1. Download Tailscale from the official page, <https://tailscale.com/download> (Windows: <https://tailscale.com/download/windows>,
   or `winget install Tailscale.Tailscale`), install it and sign in.
2. Start the game as usual (`npm start`, or `scripts\start-windows.bat`). The server listens on every interface, so it
   is reachable on the Tailscale address without any extra setting.
3. Find your Tailscale address (a `100.x.y.z` number):

```powershell
& "C:\Program Files\Tailscale\tailscale.exe" ip -4
```

   `node tools/doctor.mjs` also lists it in its friends section (朋友如何访问), labelled as a VPN address.

4. Check that the server answers on it (replace the address):

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" http://100.x.y.z:3000/healthz
```

   `200` means the server is bound there. This is a check from the host itself, so it does **not** prove that a friend
   can get through the firewall; the real test is a friend (or your phone on mobile data, with Tailscale on) opening
   `http://100.x.y.z:3000/?lang=en`.

## 2. Host: Windows firewall (admin PowerShell, run once)

Windows' own "Node.js JavaScript Runtime" allow rule, if you have one from the first-run popup, usually covers only the
**Public** profile. This rule allows port 3000 on any profile, but only from Tailscale addresses (the 100.64.0.0/10 and
fd7a:115c:a1e0::/48 ranges), so it never opens the game to your Wi-Fi or the internet:

```powershell
New-NetFirewallRule -DisplayName "Stronghold Protocol (Tailscale)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -RemoteAddress 100.64.0.0/10,fd7a:115c:a1e0::/48 -Profile Any
```

Optional, after Tailscale is installed and connected: treat the Tailscale network as Private rather than Public
(`Get-NetConnectionProfile` shows the exact `InterfaceAlias`; it is normally `Tailscale`):

```powershell
Set-NetConnectionProfile -InterfaceAlias "Tailscale" -NetworkCategory Private
```

Do the rule first: a Private network does not match a Public-only program rule, so without it the switch can make things worse.

## 3. What each friend needs

A friend always needs the Tailscale app and a **free Tailscale account** of their own (any Google / Microsoft / GitHub /
Apple login works). Then you choose one of two ways to connect them:

| | Share your PC (recommended) | Invite them to your tailnet |
|---|---|---|
| Where | Tailscale admin console → Machines → your PC → **Share** (by email, or "Copy invite link") | Admin console → Users → **Invite external users** (email or link) |
| What the friend gets | Access to **only** that PC; it shows up in their own Tailscale app | Access to **every** device in your tailnet (limit it with access controls) |
| Seats | Does not add a user to your tailnet | Each invited friend is one user of your plan (the free Personal plan has a user cap: check Tailscale's pricing page) |
| Friend does | Installs Tailscale, signs up, opens your link and accepts | Installs Tailscale, opens your invite, signs in with the invited account |
| Notes | A shared PC can answer connections but cannot start them; links expire after 30 days (single-use unless you tick "Reusable link"); treat a link like a password | Best only if you share several devices or want friends to see new ones later |

Either way, once connected the friend opens `http://<your 100.x address>:3000/?lang=en` (the address shown for your PC in
their Tailscale app; with MagicDNS the machine name works too). The `?lang=en` part saves English for that address.

## 4. Message to send friends

> Hi! To join my Stronghold Protocol game:
> 1. Install Tailscale from https://tailscale.com/download and sign up (free).
> 2. Open this link and accept it: **\<your share / invite link\>** (it connects you to my PC).
> 3. Once the Tailscale app shows it as connected, open **http://\<my 100.x.y.z address\>:3000/?lang=en** in your browser.
> 4. Enter a callsign, then type the 4-letter Alliance Key I give you in "Join Alliance" (or just open the "Copy Link" URL I send).
> Tailscale must stay running while we play. It is private: only people I invite can reach the game.

## 5. If a friend cannot connect

- The host's game must be running, and the host's Tailscale app must show as connected.
- The friend's Tailscale app must show the host's PC; try its `100.x` address in the browser first.
- Run `node tools/doctor.mjs` on the host: it shows the listening port and the firewall state.
- Corporate or school networks sometimes block Tailscale; a phone hotspot is a quick test.
