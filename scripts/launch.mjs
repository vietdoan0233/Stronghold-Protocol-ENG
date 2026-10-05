#!/usr/bin/env node
// scripts/launch.mjs — cross-platform "prepare + start + open the browser", used by scripts/start-windows.bat,
// scripts/start-windows.ps1 and scripts/start.sh (docs/DEPLOY.md).
//
//   node scripts/launch.mjs [--port 3000] [--host 0.0.0.0] [--no-open] [--no-setup] [setup options…]
//
//   1. If our server already answers on the port, just open the browser (double-clicking twice is harmless).
//   2. node tools/setup.mjs --quiet (dependencies, vendor libs, art download / resume, optional local extraction);
//      setup options such as --no-assets, --no-local, --local, --game <dir>, -y are passed through.
//   3. node server/index.js (PORT / HOST from the options or the environment; SP_COMBAT / SP_VERIFY / TRUST_PROXY /
//      DEBUG are inherited), then — once /healthz answers — prints the addresses to share and opens
//      http://localhost:<port> (not with --no-open, SP_NO_BROWSER=1, or on a Linux box without a display).
// Ctrl+C stops the server (it gets the signal from the terminal itself); the exit code is the server's.

import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IS_WIN = process.platform === 'win32';

if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error(`Node.js ${process.versions.node} is too old. Version 22 or later is required (22 / 24 LTS): https://nodejs.org/en/download`);
  process.exit(1);
}

const { c, mark } = await import('../tools/setup.mjs');
const { probePort, classifyAddresses, KIND_LABEL } = await import('../tools/doctor.mjs');

function parseArgs(argv) {
  const o = { port: Number(process.env.PORT) || 3000, host: process.env.HOST || '0.0.0.0', open: !/^(1|true|yes)$/i.test(process.env.SP_NO_BROWSER || ''), setup: true, setupArgs: [], help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const [k, v] = a.split('=');
    const val = () => (v !== undefined ? v : argv[++i]);
    if (k === '--port') o.port = Number(val()) || o.port;
    else if (k === '--host') o.host = val() || o.host;
    else if (a === '--no-open') o.open = false;
    else if (a === '--no-setup') o.setup = false;
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a === '--game') o.setupArgs.push(a, argv[++i] ?? '');
    else o.setupArgs.push(a);
  }
  return o;
}

function openBrowser(url) {
  try {
    let cmd; let args;
    if (IS_WIN) { cmd = 'rundll32'; args = ['url.dll,FileProtocolHandler', url]; }
    else if (process.platform === 'darwin') { cmd = 'open'; args = [url]; }
    else {
      if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) return false;
      cmd = 'xdg-open'; args = [url];
    }
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function printShare(port) {
  const addrs = classifyAddresses().filter((a) => a.kind === 'lan' || a.kind === 'vpn' || a.kind === 'public');
  const line = c.dim('─'.repeat(56));
  console.log(`\n${line}`);
  console.log(`${mark.ok} ${c.bold('Server is running')}   Open locally: ${c.cyan(`http://localhost:${port}`)}`);
  if (addrs.length) {
    console.log('  Share with friends (they need network access to this computer):');
    for (const a of addrs.slice(0, 4)) console.log(`    ${c.cyan(`http://${a.address}:${port}`)}  ${c.dim(KIND_LABEL[a.kind])}`);
  } else {
    console.log(c.warn('  No LAN address found. Friends cannot connect yet (check your network connection).'));
  }
  console.log(c.dim('  Create a room, then share its 4-character room code or the copied link (…/?room=code).'));
  console.log(c.dim('  If friends cannot connect, run node tools/doctor.mjs to check the firewall. Press Ctrl+C to stop the server.'));
  console.log(`${line}\n`);
}

async function waitHealthy(port, child, timeoutMs = 30000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until && child.exitCode === null) {
    const p = await probePort(port);
    if (p.state === 'ours') return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
    console.log(src.slice(1, 13).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return 0;
  }
  const localUrl = `http://localhost:${o.port}`;

  const before = await probePort(o.port, o.host);
  if (before.state === 'ours') {
    console.log(`${mark.ok} Server is already running on port ${o.port}; opening it in your browser.`);
    printShare(o.port);
    if (o.open) openBrowser(localUrl);
    return 0;
  }
  if (before.state !== 'free') {
    console.error(`${mark.err} Port ${o.port} is in use or unavailable (${before.code || before.state}).`);
    console.error(`  Choose another port: ${IS_WIN ? 'scripts\\start-windows.bat --port 3001' : 'scripts/start.sh --port 3001'}`);
    return 1;
  }

  if (o.setup) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'setup.mjs'), '--quiet', ...o.setupArgs], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) { console.error(`${mark.err} Setup failed (see the messages above).`); return r.status || 1; }
  }

  const env = { ...process.env, PORT: String(o.port), HOST: o.host };
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], { cwd: ROOT, env, stdio: 'inherit' });
  const forward = (sig) => { if (child.exitCode === null) { try { child.kill(sig); } catch { /* gone */ } } };
  // SIGINT reaches the server straight from the terminal (same process group / console); forwarding it too would make
  // the server's second-signal path force-exit. Other signals (service managers, `kill`) are forwarded.
  process.on('SIGINT', () => {});
  for (const sig of ['SIGTERM', 'SIGHUP', 'SIGBREAK']) { try { process.on(sig, () => forward(sig === 'SIGBREAK' ? 'SIGTERM' : sig)); } catch { /* unsupported here */ } }

  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve(code ?? (signal ? 0 : 1))));
  if (await waitHealthy(o.port, child)) {
    printShare(o.port);
    if (o.open && !openBrowser(localUrl)) console.log(c.dim(`Could not open a browser automatically. Visit ${localUrl} manually.`));
  }
  return exited;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || e); process.exitCode = 1; });
