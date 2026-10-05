#!/usr/bin/env node
// tools/doctor.mjs — diagnose an install (docs/DEPLOY.md「排错」). Read-only: changes nothing.
//
//   node tools/doctor.mjs [--port 3000] [--host 0.0.0.0]
//
// Checks: Node/npm versions, dependencies, public/vendor, data/*.json, downloaded art/audio, optional local-client art,
// Python (only needed for the optional extraction), the port (free / our server running → /healthz / another
// program), LAN addresses friends can use (virtual adapters and VPNs labelled), firewall hints per OS, tunnel tools
// (Tailscale, ZeroTier, cloudflared) and the env vars the server reads.
// Exit code 1 when something essential is missing (the same rule as tools/setup.mjs --check).

import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ROOT, MIN_NODE, IS_WIN, IS_MAC, c, mark, capture, padDisplay, displayWidth,
  checkNode, checkDeps, checkVendor, checkData, checkAssets, checkLocal, findClient, findPython,
} from './setup.mjs';

// ---------------------------------------------------------------------------------------------------
// LAN addresses (also used by scripts/launch.mjs)
// ---------------------------------------------------------------------------------------------------

// 名字里带这些的网卡不对局域网开放：虚拟机 / 容器 / WSL / 代理软件的 TUN 适配器（Mihomo、Clash）。
// 这里不再列 `^tun\d`：下面 VPN_IF 的 `tun\d` 先判定，任何能被 `^tun\d` 命中的名字也一定被它命中，
// 于是 tun0/tap0 一律归为 vpn（那正是同组好友互连用的地址）。写在两处只会让人以为顺序无关。
const VIRTUAL_IF = /(vethernet|virtualbox|vmware|vmnet|docker|^br-|^veth|wsl|hyper-v|vboxnet|bridge\d|utun|awdl|llw|parallels|loopback|mihomo|clash|sing-?box)/i;
// 点对点 VPN：这些地址就是同组好友互相访问用的（Tailscale / ZeroTier / WireGuard / Radmin VPN / Hamachi）。
const VPN_IF = /(tailscale|zerotier|^zt|wireguard|^wg\d|tun\d|tap|radmin|hamachi)/i;

function ipv4ToInt(ip) { return ip.split('.').reduce((n, x) => (n << 8) + Number(x), 0) >>> 0; }
function inCidr(ip, base, bits) { const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0; return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask); }

/**
 * Classify every non-internal IPv4 address: 'lan' (RFC 1918, what friends at home use), 'vpn' (Tailscale / ZeroTier /
 * Radmin / Hamachi / CGNAT 100.64/10), 'virtual' (Hyper-V, WSL, Docker, VirtualBox, a Clash/Mihomo TUN adapter … —
 * not reachable from other machines, sharing them only confuses people), 'public' (a public address directly on this
 * machine), 'linklocal' (169.254 — no DHCP, useless).
 * @returns {{ name: string, address: string, kind: string }[]} best first
 */
export function classifyAddresses(ifaces = os.networkInterfaces()) {
  const out = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const a of addrs || []) {
      if (!(a.family === 'IPv4' || a.family === 4) || a.internal) continue;
      const ip = a.address;
      let kind;
      if (inCidr(ip, '169.254.0.0', 16)) kind = 'linklocal';
      // 198.18.0.0/15 is the RFC 2544 benchmarking range. Proxies such as Clash / Mihomo use it for local TUN fake-IP
      // addresses; it is never a public IP that can be shared with friends.
      else if (inCidr(ip, '198.18.0.0', 15)) kind = 'virtual';
      else if (VPN_IF.test(name) || inCidr(ip, '100.64.0.0', 10)) kind = 'vpn';
      else if (VIRTUAL_IF.test(name)) kind = 'virtual';
      else if (inCidr(ip, '10.0.0.0', 8) || inCidr(ip, '172.16.0.0', 12) || inCidr(ip, '192.168.0.0', 16)) kind = 'lan';
      else kind = 'public';
      out.push({ name, address: ip, kind });
    }
  }
  const rank = { lan: 0, vpn: 1, public: 2, virtual: 3, linklocal: 4 };
  return out.sort((x, y) => rank[x.kind] - rank[y.kind]);
}

export const KIND_LABEL = { lan: 'LAN', vpn: 'VPN / Tailscale / ZeroTier', public: 'Public IP', virtual: 'Virtual adapter (usually unreachable from other computers)', linklocal: 'Invalid address (no IP assigned)' };

// ---------------------------------------------------------------------------------------------------
// Port probe
// ---------------------------------------------------------------------------------------------------

function getJson(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { body += d; if (body.length > 65536) req.destroy(); });
      res.on('end', () => { let json = null; try { json = JSON.parse(body); } catch { /* not ours */ } resolve({ status: res.statusCode, json }); });
    });
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.on('error', (e) => resolve({ error: e.code || e.message }));
  });
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', (e) => resolve({ ok: false, code: e.code }));
    srv.listen({ port, host, exclusive: true }, () => srv.close(() => resolve({ ok: true })));
  });
}

/** 'ours' (our server answers /healthz), 'free', 'busy' (another program) or 'denied'. */
export async function probePort(port, host = '0.0.0.0') {
  const r = await getJson(`http://127.0.0.1:${port}/healthz`);
  if (r.json && r.json.ok === true && 'uptimeSec' in r.json) return { state: 'ours', health: r.json };
  const l = await canListen(port, host);
  if (l.ok) return { state: 'free' };
  if (l.code === 'EACCES') return { state: 'denied', code: l.code };
  return { state: 'busy', code: l.code, http: r.status };
}

// ---------------------------------------------------------------------------------------------------
// Firewall hints
// ---------------------------------------------------------------------------------------------------

function firewallHints(port) {
  const lines = [];
  if (IS_WIN) {
    const rule = capture('netsh', ['advfirewall', 'firewall', 'show', 'rule', 'name=Stronghold Protocol'], { timeout: 10000 });
    if (rule.ok) lines.push([mark.ok, 'Inbound firewall rule "Stronghold Protocol" is present.']);
    else {
      lines.push([mark.warn, 'Firewall rule "Stronghold Protocol" not found. If friends cannot connect, run this in PowerShell as Administrator:']);
      lines.push(['', c.cyan(`netsh advfirewall firewall add rule name="Stronghold Protocol" dir=in action=allow protocol=TCP localport=${port} profile=private,domain`)]);
      lines.push(['', c.dim('(Or allow Node.js on Private networks in the Windows prompt on first launch; scripts\\install-service-windows.ps1 can add this rule too.)')]);
    }
    const prof = capture('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      "Get-NetConnectionProfile | ForEach-Object { $_.InterfaceAlias + '|' + $_.NetworkCategory }"], { timeout: 15000 });
    if (prof.ok && prof.out) {
      for (const l of prof.out.split(/\r?\n/).filter(Boolean)) {
        const [alias, cat] = l.split('|');
        if (/public/i.test(cat || '')) {
          lines.push([mark.warn, `Network "${alias}" is Public. Windows blocks inbound connections on Public networks by default. For a trusted home network, you can switch it to Private:`]);
          lines.push(['', c.cyan(`Set-NetConnectionProfile -InterfaceAlias "${alias}" -NetworkCategory Private`) + c.dim(' (PowerShell as Administrator)')]);
        } else lines.push([mark.ok, `Network "${alias}" type: ${cat}`]);
      }
    }
  } else if (IS_MAC) {
    const fw = capture('/usr/libexec/ApplicationFirewall/socketfilterfw', ['--getglobalstate'], { timeout: 5000 });
    if (/enabled/i.test(fw.out) && !/disabled/i.test(fw.out)) {
      lines.push([mark.warn, 'The macOS firewall is enabled. On first launch, allow node to accept incoming connections in the prompt, or run:']);
      lines.push(['', c.cyan(`sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "${process.execPath}" --unblockapp "${process.execPath}"`)]);
    } else if (fw.out) lines.push([mark.ok, 'The macOS firewall is off (LAN connections can connect directly).']);
  } else {
    lines.push([c.dim('i'), `Linux: if ufw or firewalld is enabled, allow this port: sudo ufw allow ${port}/tcp  or  sudo firewall-cmd --add-port=${port}/tcp --permanent && sudo firewall-cmd --reload`]);
  }
  return lines;
}

function tool(cmd, args) {
  const r = capture(cmd, args, { timeout: 5000, shell: IS_WIN });
  return r.ok ? (r.out.split(/\r?\n/)[0] || 'ok') : null;
}

// ---------------------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { port: Number(process.env.PORT) || 3000, host: process.env.HOST || '0.0.0.0', help: false };
  for (let i = 0; i < argv.length; i++) {
    const [k, v] = argv[i].split('=');
    const val = () => (v !== undefined ? v : argv[++i]);
    if (k === '--port') o.port = Number(val()) || o.port;
    else if (k === '--host') o.host = val() || o.host;
    else if (k === '-h' || k === '--help') o.help = true;
    else throw new Error(`unknown option ${argv[i]}`);
  }
  return o;
}

async function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); return 2; }
  if (opts.help) { console.log('node tools/doctor.mjs [--port 3000] [--host 0.0.0.0]  — read-only diagnostics; no files are changed'); return 0; }
  const rows = [];
  let bad = false;
  const row = (state, label, detail = '') => { rows.push([state, label, detail]); if (state === 'err') bad = true; };
  const section = (title) => rows.push([null, title]);

  console.log(c.bold('\nStronghold Protocol: Alliance · Doctor') + c.dim(`  ${os.type()} ${os.release()} ${process.arch} · ${ROOT}`));

  section('Runtime');
  const node = checkNode();
  row(node.ok ? (node.recommended ? 'ok' : 'warn') : 'err', 'Node.js', `v${node.version}` + (node.ok ? (node.recommended ? '' : ' (22 / 24 LTS recommended)') : ` (version ${MIN_NODE}+ required: https://nodejs.org/en/download)`));
  const npmV = tool(IS_WIN ? 'npm.cmd' : 'npm', ['--version']);
  row(npmV ? 'ok' : 'warn', 'npm', npmV ? `v${npmV}` : 'not found (included with Node.js)');

  section('Installation');
  const deps = checkDeps();
  row(deps.ok ? 'ok' : 'err', 'Dependencies (node_modules)', deps.ok ? '' : `missing ${deps.missing.join(', ')} → npm install`);
  const vendor = checkVendor();
  row(vendor.ok ? 'ok' : 'err', 'Client libraries (public/vendor)', vendor.ok ? (vendor.optionalMissing.length ? 'three.js missing (using the 2D board)' : '') : `missing ${vendor.missing.join(', ')} → node tools/vendor.mjs`);
  const data = checkData();
  row(data.ok ? 'ok' : 'err', 'Game data (data/*.json)', data.ok ? '' : `missing or invalid: ${[...data.missing, ...data.broken].join(', ')}`);
  const assets = checkAssets();
  row(assets.ok ? 'ok' : 'warn', 'Art and audio (public/assets)', assets.ok ? `${assets.total} files`
    : !assets.present ? 'not downloaded → node tools/setup.mjs (the game can still run with placeholders)' : `${assets.missing}/${assets.total} missing (for example: ${assets.sample.join(' ')}) → node tools/setup.mjs`);
  const fonts = fs.existsSync(path.join(ROOT, 'public', 'fonts', 'fonts.css'));
  row(fonts ? 'ok' : 'warn', 'Fonts (public/fonts)', fonts ? '' : 'not generated (created with the asset download; system fonts are used when missing)');
  const local = checkLocal();
  const client = findClient(null);
  row(local.manifest ? 'ok' : 'skip', 'Local client assets (optional)', local.manifest
    ? `${local.count} extracted${local.board3d ? '; 3D board available' : '; no board textures (using the 2D board)'}${local.board3d && !local.tiles ? '; tiles.json missing → node tools/setup.mjs' : ''}`
    : client ? `Detected ${client.kind} client → node tools/setup.mjs --local` : 'not extracted (the game is unaffected)');
  if (client || local.manifest) {
    const py = findPython();
    row(py ? 'ok' : 'skip', 'Python (for extraction only)', py ? `${py.cmd} ${py.version}` : 'Python 3.8+ not found');
  }

  section('Server');
  const port = await probePort(opts.port, opts.host);
  if (port.state === 'ours') {
    const h = port.health;
    row('ok', `Port ${opts.port}`, `server running${h.app ? ` (v${h.app})` : ''}: uptime ${h.uptimeSec}s · rooms ${h.rooms ?? '?'} · matches ${h.matches ?? '?'} · connections ${h.sockets ?? '?'}`);
  } else if (port.state === 'free') row('ok', `Port ${opts.port}`, 'available (server is not running; start it with npm start)');
  else if (port.state === 'denied') row('err', `Port ${opts.port}`, 'permission denied (Linux ports below 1024 require root) → choose another PORT');
  else row('err', `Port ${opts.port}`, `in use by another program (${port.code}) → stop it or choose another port: ${IS_WIN ? '$env:PORT=3001; npm start' : 'PORT=3001 npm start'}`);
  const env = ['PORT', 'HOST', 'SP_COMBAT', 'SP_VERIFY', 'SP_LOCALE', 'TRUST_PROXY', 'DEBUG'].filter((k) => process.env[k] != null && process.env[k] !== '');
  row('skip', 'Environment variables', env.length ? env.map((k) => `${k}=${process.env[k]}`).join(' ') : 'all defaults (PORT=3000 HOST=0.0.0.0 SP_COMBAT=client SP_VERIFY=off SP_LOCALE=en)');

  section('How friends can connect');
  const addrs = classifyAddresses();
  if (!addrs.length) row('warn', 'Network', 'no usable IPv4 addresses found (are you connected to a network?)');
  for (const a of addrs) {
    const usable = a.kind === 'lan' || a.kind === 'vpn' || a.kind === 'public';
    row(usable ? 'ok' : 'skip', `http://${a.address}:${opts.port}`, `${KIND_LABEL[a.kind]} · ${a.name}`);
  }
  if (opts.host !== '0.0.0.0' && opts.host !== '::') row('warn', 'HOST', `HOST=${opts.host}: listening on this address only; other computers may not connect (default: 0.0.0.0)`);

  section('Firewall');
  for (const [m, text] of firewallHints(opts.port)) rows.push([m === '' ? 'raw' : 'mark', text, '', m]);

  section('Internet connection tools (optional)');
  const ts = tool('tailscale', ['version']);
  const zt = tool('zerotier-cli', ['-v']);
  const cf = tool('cloudflared', ['--version']);
  row(ts ? 'ok' : 'skip', 'Tailscale', ts || 'not installed (recommended: https://tailscale.com/download)');
  row(zt ? 'ok' : 'skip', 'ZeroTier', zt || 'not installed');
  row(cf ? 'ok' : 'skip', 'cloudflared', cf || 'not installed (temporary public link: cloudflared tunnel --url http://localhost:' + opts.port + ')');

  // print
  const width = Math.max(...rows.filter((r) => r[0] && r[0] !== 'raw' && r[0] !== 'mark').map((r) => displayWidth(r[1]))) + 2;
  for (const r of rows) {
    if (r[0] === null) { console.log(c.bold(`\n${r[1]}`)); continue; }
    if (r[0] === 'raw') { console.log(`  ${r[1]}`); continue; }
    if (r[0] === 'mark') { console.log(`${r[3]} ${r[1]}`); continue; }
    console.log(`${mark[r[0]]} ${padDisplay(r[1], width)}${r[2] ? c.dim(r[2]) : ''}`);
  }
  console.log(bad ? c.err('\nRequired fixes found (✘).') + ' Most issues can be fixed by running node tools/setup.mjs.' : c.ok('\nThe environment looks good.'));
  return bad ? 1 : 0;
}

function isMain() {
  try { return !!process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (isMain()) main().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || e); process.exitCode = 1; });
