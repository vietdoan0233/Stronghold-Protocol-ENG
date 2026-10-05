#!/usr/bin/env node
// scripts/make-windows-bundle.mjs — 打一份「开箱即用」的 Windows 便携包（docs/WINDOWS.md）。
//
//   node scripts/make-windows-bundle.mjs [--out <dir>] [--no-node] [--force]
//
// 产物目录（默认 <仓库的上一级>\Stronghold-Protocol-Windows）：
//   node\node.exe            官方 Windows x64 便携版 Node（版本与 sha256 钉在下面的 NODE_PIN）
//   node\LICENSE-node.txt    Node 自己的许可证（和 node.exe 一起从官方 zip 里取出来）
//   app\                     游戏本体：**只收 git 跟踪的文件** + 生产依赖 + 素材，离线可玩
//   Start-Game.bat             app\scripts\launch.mjs --no-setup
//   README-Quickstart.md       给玩家看的说明（含非官方 / 严禁盈利 / 素材版权声明）
//   LICENSE / NOTICE.md / THIRD-PARTY-NOTICES.md
//
// 目标机器什么都不用装：解压 → 双击 Start-Game.bat。素材约 330 MB 是硬成本，包因此较大。
//
// 三条硬规则（都是踩过的坑）：
//   1. app\ 的文件清单来自 `git ls-files`，不是手写的跳过表 —— `.env` / `.venv` / `.claude` /
//      `scripts/service.env.cmd` 这些本机文件被 .gitignore 挡在版本库外，因此天然进不了发行包。
//      旧实现用一张窄表整树复制，漏一项就是把密钥打进别人下载的压缩包。
//   2. node_modules 用 `npm ci --omit=dev` 重新装一遍，不带 devDependency（puppeteer-core 之类）。
//   3. node.exe **每次都从校验过的官方 zip 重新解压**：下载的 zip 缓存进仓库的 .cache\，解压目录是
//      新建的临时目录、用完即删。旧实现「临时目录里那个 node.exe 还在就直接用」，和校验过的 zip 没有
//      对应关系 —— 上次解压中断留下的残缺文件会被打进包，共享的 /tmp 也不安全。

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IS_WIN = process.platform === 'win32';
const MB = (n) => `${(n / (1024 * 1024)).toFixed(1)} MB`;

/** 官方 Node zip 的下载缓存（不进版本库）。放仓库下而不是系统临时目录：后者是共享的，中断留下的残片会混进来。 */
const NODE_CACHE_DIR = path.join(ROOT, '.cache');

/**
 * 便携版 Node：版本与 sha256 **钉死在仓库里**，运行时只认这个常量。
 *
 * 不用 `latest-v22.x`：那样今天打的包和上个月打的包内容不同，出了问题也无从复现；而且校验哈希是运行时
 * 现去 nodejs.org 抓的，等于把「发出去的二进制是什么」交给当时的网络应答决定。换版本请改这里
 * （并在 `--node-version` 的同时用 `--sha256` 显式覆盖）。
 */
const NODE_PIN = Object.freeze({
  version: 'v22.23.3',
  file: 'node-v22.23.3-win-x64.zip',
  sha256: '2b0ff57b049cda1bbcea2240eec20467018713c1efe1f7360c2681859b90ed71',
});

/** 这几份不进版本库（npm / tools/setup.mjs 生成），但必须进包，否则游戏缺素材或缺前端库。 */
const ASSET_DIRS = ['public/assets', 'public/fonts', 'public/vendor'];

/** 版本库里有、但便携包不要的（测试代码，省体积）。 */
const SKIP_TRACKED = ['test/'];

/** 包根要带的许可证 / 声明。 */
const LEGAL_FILES = ['LICENSE', 'NOTICE.md', 'THIRD-PARTY-NOTICES.md'];

/**
 * 本机从游戏文件里提取出来的 3D 棋盘贴图清单（不进版本库）。
 *
 * `public/assets/local`（约 68 MB）会随 `public/assets` 一起进包，但游戏是**靠这份 JSON** 才知道哪些贴图
 * 可用 —— 只带贴图不带清单，玩家拿到的是 68 MB 用不上的文件。它存在时就一起收。
 */
const LOCAL_ASSET_MANIFEST = path.join('data', 'local-assets.json');

function parseArgs(argv) {
  const o = { out: '', node: true, force: false, nodeSpec: '', sha256: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const [k, v] = a.split('=');
    const val = () => (v !== undefined ? v : argv[++i]);
    if (k === '--out') o.out = String(val() || '');
    else if (k === '--node-version') o.nodeSpec = String(val() || '');
    else if (k === '--sha256') o.sha256 = String(val() || '').toLowerCase();
    else if (a === '--no-node') o.node = false;
    else if (a === '--force') o.force = true;
    else if (a === '-h' || a === '--help') o.help = true;
  }
  return o;
}

const HELP = [
  'node scripts/make-windows-bundle.mjs — Build a Windows portable bundle',
  '',
  '  --out <dir>        Bundle output directory (default: <repository parent>/Stronghold-Protocol-Windows)',
  '  --no-node          Omit portable Node.js (the target PC must have Node.js 22+)',
  '  --force            Replace only an empty directory or a previous bundle',
  '  --node-version X   Select a Node.js version (default: ' + NODE_PIN.version + '); also provide --sha256',
  '  --sha256 <hash>    SHA-256 for the selected win-x64 ZIP (from official SHASUMS256.txt)',
  '',
  '  app\\ contains tracked files, production dependencies (npm ci --omit=dev), and public/{assets,fonts,vendor}.',
  '  Local files such as .env, .venv, .claude, and scripts/service.env.cmd are never bundled.',
  '  data/local-assets.json is included if present; it is required to use locally extracted 3D board textures.',
  '',
  '  The bundle is not compressed, index.html is unchanged, and there is no installer.',
  '  Start-Game.bat runs app\\scripts\\launch.mjs --no-setup (assets are included, so setup needs no network).',
].join('\n');

/**
 * 路径的规范形式：把符号链接、macOS 的 `/tmp`、Windows 的 8.3 短名与大小写都归一。
 *
 * 产物目录通常还不存在，`fs.realpathSync.native` 会 ENOENT，所以只对**已存在的最深祖先**做归一，
 * 剩下的段原样接回去。Windows / macOS 的文件系统默认不区分大小写，比较前统一转小写 —— 不然
 * `--out c:\users\…\stronghold-protocol` 这种写法会绕过检查，而它指向的就是仓库本身。
 * @param {string} p
 * @returns {string}
 */
function canonical(p) {
  let head = path.resolve(p);
  const tail = [];
  for (;;) {
    try {
      head = fs.realpathSync.native(head);
      break;
    } catch {
      const parent = path.dirname(head);
      if (parent === head) break;                 // 到根都还不存在：只能按字面量比
      tail.unshift(path.basename(head));
      head = parent;
    }
  }
  const joined = tail.length ? path.join(head, ...tail) : head;
  // 只有 Linux 的默认文件系统区分大小写；darwin 上按不区分处理是偏保守的一侧（宁可拒绝也不误删）。
  return process.platform === 'linux' ? joined : joined.toLowerCase();
}

/**
 * `--out` 指到仓库本身或它的**上级**目录时，`--force` 会先 `rm -rf` 那个目录 —— 也就是把仓库整个删掉。
 * 这种路径直接拒绝（指向仓库内部是允许的，只是产物会出现在 git status 里）。
 *
 * 注意这只是第一道防线：真正的保险是下面 `forceDeleteVerdict()` 那条「不确定就不删」的规则，
 * 因为再小心的路径比较也挡不住 8.3 短名之类的花样。
 * @param {string} out
 * @param {string} [root]
 */
export function outDirIsUnsafe(out, root = ROOT) {
  const r = canonical(root);
  const o = canonical(out);
  if (o === r) return true;
  const rel = path.relative(o, r);          // 从 out 看 root 的相对位置
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** 上一次打的便携包长这样：包根有这份说明，还有一个 app\ 目录。 */
const BUNDLE_MARKERS = Object.freeze(['README-Quickstart.md', 'app']);

/**
 * `--force` 允不允许删掉这个目录？
 *
 * 只认三种情况：目录还不存在；目录是空的；目录**看起来就是上次打的便携包**。
 * 其余一律拒绝 —— 路径比较挡不住大小写、符号链接、8.3 短名的花招，所以规则反过来写：
 * 只有能确认「这就是上次的产物」才动手删，认不出来就什么都不删。
 * @param {string} dir
 * @returns {'missing' | 'empty' | 'bundle' | 'refuse'}
 */
export function forceDeleteVerdict(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return e?.code === 'ENOENT' ? 'missing' : 'refuse';   // 读不出来（权限 / 不是目录）就别删
  }
  if (entries.length === 0) return 'empty';
  const app = entries.find((e) => e.name === 'app');
  const looksLikeBundle = BUNDLE_MARKERS.every((n) => entries.some((e) => e.name === n))
    && !!app && (app.isDirectory() || app.isSymbolicLink());
  return looksLikeBundle ? 'bundle' : 'refuse';
}

/**
 * 版本库里跟踪的文件（仓库相对路径，posix 分隔符）。
 *
 * 这是 app\ 文件清单的唯一来源。用 NUL 分隔读，避免中文 / 空格文件名被 git 转义或截断。
 * @returns {string[]}
 */
function trackedFiles() {
  const r = spawnSync('git', ['-C', ROOT, 'ls-files', '-z'], { maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status !== 0) {
    throw new Error('git ls-files failed: the bundle includes only tracked files; run this in a complete Git repository');
  }
  return r.stdout.toString('utf8').split('\0').filter(Boolean);
}

/** 按相对路径清单逐个复制（自动建目录）；源文件不存在就跳过（例如素材还没下载）。 */
export async function copyFiles(relPaths, dst, root = ROOT) {
  let files = 0; let bytes = 0;
  for (const rel of relPaths) {
    const from = path.join(root, rel);
    const to = path.join(dst, rel);
    let st;
    try {
      // eslint-disable-next-line no-await-in-loop
      st = await fsp.stat(from);
    } catch { continue; }
    if (!st.isFile()) continue;
    // eslint-disable-next-line no-await-in-loop
    await fsp.mkdir(path.dirname(to), { recursive: true });
    // eslint-disable-next-line no-await-in-loop
    await fsp.copyFile(from, to);
    files++; bytes += st.size;
  }
  return { files, bytes };
}

/**
 * 整目录复制（素材 / 依赖），跳过符号链接与点开头的条目。
 *
 * 点开头的条目一律不要：`public/assets` 里可能躺着打包机器自己的 `.DS_Store`，它既不属于项目也不该发出去。
 */
export async function copyDir(src, dst) {
  let files = 0; let bytes = 0;
  const walk = async (d, out) => {
    await fsp.mkdir(out, { recursive: true });
    const entries = await fsp.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const from = path.join(d, e.name);
      const to = path.join(out, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        // eslint-disable-next-line no-await-in-loop
        await walk(from, to);
        continue;
      }
      if (!e.isFile()) continue;
      // eslint-disable-next-line no-await-in-loop
      await fsp.copyFile(from, to);
      files++;
      try {
        // eslint-disable-next-line no-await-in-loop
        bytes += (await fsp.stat(to)).size;
      } catch { /* ignore */ }
    }
  };
  await walk(src, dst);
  return { files, bytes };
}

async function dirSize(dir) {
  let bytes = 0; let files = 0;
  const walk = async (d) => {
    let entries;
    try { entries = await fsp.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) { files++; try { bytes += (await fsp.stat(p)).size; } catch { /* ignore */ } }
    }
  };
  await walk(dir);
  return { bytes, files };
}

/**
 * 只装生产依赖，装到 app\node_modules。
 *
 * 在临时目录里 `npm ci --omit=dev` 再搬过来：既拿到干净的生产依赖（不带 puppeteer-core 这类
 * devDependency），又不会动本仓库自己的 node_modules。
 */
async function installProductionDeps(appDir) {
  const stage = path.join(appDir, '.deps-stage');
  await fsp.rm(stage, { recursive: true, force: true });
  await fsp.mkdir(stage, { recursive: true });
  for (const f of ['package.json', 'package-lock.json']) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) throw new Error(`Missing ${f}; cannot install production dependencies`);
    await fsp.copyFile(src, path.join(stage, f));
  }
  console.log('  · Installing production dependencies with npm ci --omit=dev…');
  // --ignore-scripts：本仓库的 postinstall 是 `node tools/vendor.mjs`（把 npm 里的前端库拷进
  // public/vendor）。这个暂存目录里只有一份 package.json，脚本根本不存在，npm ci 会在 postinstall
  // 阶段 MODULE_NOT_FOUND；而 public/vendor 本来就是整目录进包（见 ASSET_DIRS），不需要再跑一次。
  // 依赖里也没有需要编译的原生模块（htm / pixi / preact / three / ws 都是纯 JS）。
  const args = ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'];
  // Windows 上 npm 是 npm.cmd（批处理），不能直接 spawn；显式走 cmd.exe，避免 shell:true 的参数转义告警。
  const r = IS_WIN
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], { cwd: stage, stdio: 'inherit' })
    : spawnSync('npm', args, { cwd: stage, stdio: 'inherit' });
  if (r.error || r.status !== 0) throw new Error('npm ci --omit=dev failed (the portable bundle needs production dependencies; check your internet connection)');
  await fsp.rm(path.join(appDir, 'node_modules'), { recursive: true, force: true });
  await fsp.rename(path.join(stage, 'node_modules'), path.join(appDir, 'node_modules'));
  await fsp.rm(stage, { recursive: true, force: true });
}

/**
 * PowerShell 单引号字符串的字面量，内部 `'` 要写成 `''`。
 *
 * 路径是拼进 `-Command` 的，合法路径里带 `'`（中文输入法很容易打出来）时直接拼接会截断命令，
 * 解压那一档就整条失效。
 * @param {string} s
 */
export function psSingleQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

/**
 * 把 zip 解到 dir（必须是已存在的空目录）。
 *
 * 三种解压器按平台兜底：`tar`（Windows 10+ 的 bsdtar、macOS 的 bsdtar 都认得 zip）、`unzip`（GNU tar
 * 解不了 zip，Linux 上是这一档）、Windows 自带的 `Expand-Archive`。全试过才报错。
 * @returns {string} 实际成功的命令名
 */
function extractZip(zipPath, dir) {
  const attempts = [
    ['tar', ['-xf', zipPath, '-C', dir]],
    ['unzip', ['-q', zipPath, '-d', dir]],
  ];
  if (IS_WIN) attempts.push(['powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath ${psSingleQuote(zipPath)} -DestinationPath ${psSingleQuote(dir)} -Force`]]);
  let last = '';
  for (const [cmd, args] of attempts) {
    const r = spawnSync(cmd, args, { stdio: 'ignore' });
    if (!r.error && r.status === 0) return cmd;
    last = `${cmd}: ${r.error ? r.error.message : `exit code ${r.status}`}`;
  }
  throw new Error(`Failed to extract ${path.basename(zipPath)} (requires tar or unzip; Windows can also use Expand-Archive): ${last}`);
}

/**
 * 确保官方 zip 在仓库的 .cache\ 里，且 sha256 与仓库里钉死的一致。
 * @returns {Promise<string>} zip 的绝对路径
 */
async function ensureNodeZip(version, wantHash) {
  const zipName = `node-${version}-win-x64.zip`;
  const zipPath = path.join(NODE_CACHE_DIR, zipName);

  if (fs.existsSync(zipPath)) {
    const h = crypto.createHash('sha256').update(await fsp.readFile(zipPath)).digest('hex');
    if (h === wantHash) return zipPath;
    console.log(`  · Checksum mismatch for ${path.relative(ROOT, zipPath)}; downloading it again`);
  }

  const url = `https://nodejs.org/dist/${version}/${zipName}`;
  console.log(`  · Downloading ${url} (about 30 MB)`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = crypto.createHash('sha256').update(buf).digest('hex');
  if (got !== wantHash) throw new Error(`${zipName} SHA-256 mismatch:\n    expected ${wantHash}\n    got      ${got}`);
  await fsp.mkdir(NODE_CACHE_DIR, { recursive: true });
  await fsp.writeFile(zipPath, buf);
  return zipPath;
}

/**
 * 便携版 Node：从**校验过的** zip 解出 node.exe 与 LICENSE。
 *
 * 每次都新建一个临时目录重新解压，绝不复用上一次解压出来的文件 —— 缓存的是 zip，不是解压结果：
 * 解压中断留下的残缺 node.exe 与 zip 没有任何对应关系，直接复制就会把坏文件发出去。
 * @param {string} bundleNodeDir
 * @param {string} version 形如 v22.23.3
 * @param {string} zipPath 已校验 sha256 的官方 win-x64 zip
 */
async function extractPortableNode(bundleNodeDir, version, zipPath) {
  const zipName = `node-${version}-win-x64.zip`;
  const rootName = zipName.replace(/\.zip$/, '');   // win-x64 zip 的固定布局：<zip 名>/node.exe
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'sp-node-'));
  try {
    const tool = extractZip(zipPath, tmp);
    const nodeExe = path.join(tmp, rootName, 'node.exe');
    const license = path.join(tmp, rootName, 'LICENSE');
    if (!fs.existsSync(nodeExe)) throw new Error(`node.exe was not found after extraction: ${nodeExe}`);
    // 发出去的二进制必须带它自己的许可证 —— 官方 zip 里就有，取出来放旁边。
    if (!fs.existsSync(license)) throw new Error(`The official ZIP has no LICENSE file: ${license} (cannot distribute the bundle without it)`);
    await fsp.mkdir(bundleNodeDir, { recursive: true });
    await fsp.copyFile(nodeExe, path.join(bundleNodeDir, 'node.exe'));
    await fsp.copyFile(license, path.join(bundleNodeDir, 'LICENSE-node.txt'));
    console.log(`    Extractor: ${tool}`);
    return {
      version,
      bytes: (await fsp.stat(path.join(bundleNodeDir, 'node.exe'))).size,
      licenseBytes: (await fsp.stat(path.join(bundleNodeDir, 'LICENSE-node.txt'))).size,
    };
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true });
  }
}

/** Windows launcher batch file; keep its contents ASCII-only. */
function bat(body) {
  return `@echo off\r\nchcp 65001 >nul\r\nsetlocal\r\nset "HERE=%~dp0"\r\nset "NODE="\r\nif exist "%HERE%node\\node.exe" set "NODE=%HERE%node\\node.exe"\r\nif not defined NODE set "NODE=node"\r\n${body}\r\nset "CODE=%ERRORLEVEL%"\r\nif not "%CODE%"=="0" pause\r\nexit /b %CODE%\r\n`;
}

/**
 * 包内说明。带不带便携版 Node 会影响三处措辞（是否需要预装 Node、许可证在哪、目录结构），
 * 所以先算好片段再拼，别在模板里嵌套引号。
 */
export function bundleReadme({ version, withNode }) {
  const nodeNeed = withNode
    ? 'The target PC does not need Node.js installed: node\\node.exe contains portable Node.js ' + version + '.'
    : 'This bundle does not include portable Node.js. Install Node.js 22 or 24 LTS on the target PC first.';
  const nodeLicence = withNode ? ' and node\\LICENSE-node.txt (Node.js MIT license)' : '';
  const tree = withNode
    ? [
        'node\\node.exe                   Portable Node.js VERSION (official x64 archive, SHA-256 verified)',
        'node\\LICENSE-node.txt           Node.js license (MIT)',
        'app\\                             Game files: server / shared / public (all assets) / data / scripts / tools',
        'Start-Game.bat                   Runs app\\scripts\\launch.mjs --no-setup',
        'README-Quickstart.md             This file',
        'LICENSE / NOTICE.md / THIRD-PARTY-NOTICES.md',
      ].join('\n').replace('VERSION', version)
    : [
        'app\\                             Game files: server / shared / public (all assets) / data / scripts / tools',
        'Start-Game.bat                   Runs app\\scripts\\launch.mjs --no-setup',
        'README-Quickstart.md             This file',
        'LICENSE / NOTICE.md / THIRD-PARTY-NOTICES.md',
        '',
        'The node\\ directory is not included; install Node.js 22 or 24 LTS yourself.',
      ].join('\n');

  return [
    '# Stronghold Protocol: Alliance — Windows portable bundle',
    '',
    'After extraction, double-click Start-Game.bat. Assets and dependencies are included; nothing else needs to be downloaded.',
    nodeNeed,
    '',
    'Play offline: artwork, audio, dependencies, and fonts are included. Offline, the page uses the bundled app\\public\\fonts',
    '(Bender / Novecento Wide) and system sans-serif fonts; gameplay is unaffected. When online, the page also loads',
    'web fonts such as Noto Sans SC from Google Fonts (the external link in index.html is unchanged and does not block',
    'rendering). This makes Chinese text look closer to the original; offline font loading will not block the game or cause errors.',
    '',
    '## Notices',
    '',
    '> [!IMPORTANT]',
    '> - This is an unofficial fan project made by players. It is not affiliated with, authorized, or endorsed by Hypergryph, Yostar, or their affiliates.',
    '> - Arknights and Stronghold Protocol: Alliance names, characters, artwork, music, sound effects, text, and data belong to their respective rights holders. Those materials are not covered by the GPL-3.0 license for this project; GPL covers only code written for this project.',
    '> - This project is for learning, discussion, and personal non-commercial use only. Commercial use is prohibited, including selling the project or bundled packages, paid downloads or distribution, paid hosting or setup services, monetization through ads, tips, or memberships, and any other commercial use.',
    '> - The bundle includes game artwork and audio for convenience. By downloading it, you agree to this notice. Do not use the assets outside this project or redistribute them separately. See NOTICE.md for the full terms.',
    '> - Rights holders may contact us through an Issue if they believe this project infringes their rights; we will remove the relevant material promptly.',
    '> - This project is provided as is, without warranties. Use it at your own risk.',
    '',
    'LICENSE in the bundle applies only to code written for this project. Licenses for bundled Node.js (MIT) and other third-party components are listed in THIRD-PARTY-NOTICES.md' + nodeLicence + '.',
    '',
    '## How to play',
    '',
    'Host a game    Double-click Start-Game.bat. This PC hosts the game and opens it in a browser.',
    '               The console prints a LAN address to share with friends (for example, http://192.168.1.23:3000).',
    'Join a game    You do not need this bundle; open the host URL in your browser.',
    '',
    'The first time you host, Windows Firewall may prompt you. Allow access on private networks so friends can connect.',
    'After creating a room, share its 4-digit room code or the copied link (…/?room=code) with friends.',
    '',
    '## Folder contents',
    '',
    String.fromCharCode(96, 96, 96),
    tree,
    String.fromCharCode(96, 96, 96),
    '',
    'To uninstall, delete the whole folder. The bundle does not write to the registry or install files in system directories.',
    'Save data and nicknames are stored in the browser localStorage on that PC.',
  ].join('\n');
}
async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log(HELP); return 0; }
  const out = path.resolve(o.out || path.join(path.dirname(ROOT), 'Stronghold-Protocol-Windows'));
  const appDir = path.join(out, 'app');
  const nodeDir = path.join(out, 'node');

  // 版本与哈希：默认用仓库里钉死的那一份；换版本必须同时给 --sha256，否则拒绝。
  let nodeVersion = NODE_PIN.version;
  let nodeHash = NODE_PIN.sha256;
  if (o.nodeSpec) {
    if (!/^v?\d+\.\d+\.\d+$/.test(o.nodeSpec)) {
      console.error(`✖ --node-version must be a specific version such as v22.23.3; received ${o.nodeSpec}. Moving targets such as latest-22.x make builds non-reproducible.`);
      return 1;
    }
    nodeVersion = o.nodeSpec.startsWith('v') ? o.nodeSpec : `v${o.nodeSpec}`;
    if (nodeVersion !== NODE_PIN.version) {
      if (!/^[0-9a-f]{64}$/.test(o.sha256)) {
        console.error(`✖ --node-version ${nodeVersion} differs from the pinned ${NODE_PIN.version}. Also provide --sha256 <64 hexadecimal characters> from the official SHASUMS256.txt.`);
        return 1;
      }
      nodeHash = o.sha256;
    }
  }

  console.log(`\nStronghold Protocol: Alliance · Windows portable bundle\n  Repository: ${ROOT}\n  Output:     ${out}\n`);

  // --out 指到仓库本身 / 上级目录时直接拒绝；--force 另外只肯删「空目录」或「上一次打的包」。
  if (outDirIsUnsafe(out)) {
    console.error(`✖ --out points to the repository or one of its parent directories: ${out}\n  --force could delete the repository. Choose a directory outside it (for example, D:\\Game\\Stronghold-Protocol-Windows).`);
    return 1;
  }
  const verdict = forceDeleteVerdict(out);
  if (verdict !== 'missing') {
    if (!o.force) {
      console.error(`✖ ${out} already exists. Add --force to replace it; only empty directories or a previous bundle can be removed.`);
      return 1;
    }
    if (verdict === 'refuse') {
      console.error(`✖ ${out} exists, but it is neither empty nor recognizable as a previous bundle (the root must contain README-Quickstart.md and app\\).`
        + '\n  It was left untouched to prevent accidental deletion. Verify and remove it yourself, or choose another --out (for example, D:\\Game\\Stronghold-Protocol-Windows).');
      return 1;
    }
    await fsp.rm(out, { recursive: true, force: true });
    console.log(`  · Removed ${out} (${verdict === 'empty' ? 'empty directory' : 'previous bundle'})`);
  }
  await fsp.mkdir(out, { recursive: true });

  // 1) 游戏代码：只收 git 跟踪的文件
  const all = trackedFiles();
  const wanted = all.filter((rel) => !SKIP_TRACKED.some((p) => rel === p || rel.startsWith(p)));
  console.log(`  · Copying game files (${wanted.length} tracked files; skipping ${all.length - wanted.length} test/ files)…`);
  const copied = await copyFiles(wanted, appDir);
  console.log(`    Done: ${copied.files} files / ${MB(copied.bytes)}`);

  // 2) 素材与前端库（不进版本库，必须存在）
  for (const d of ASSET_DIRS) {
    if (!fs.existsSync(path.join(ROOT, d))) {
      throw new Error(`Missing ${d}; run node tools/setup.mjs first to prepare assets and frontend libraries`);
    }
  }
  console.log(`  · Copying assets and frontend libraries (${ASSET_DIRS.join(', ')})…`);
  let assetFiles = 0; let assetBytes = 0;
  for (const d of ASSET_DIRS) {
    // eslint-disable-next-line no-await-in-loop
    const s = await copyDir(path.join(ROOT, d), path.join(appDir, d));
    assetFiles += s.files; assetBytes += s.bytes;
  }
  console.log(`    Done: ${assetFiles} files / ${MB(assetBytes)}`);

  // 2b) 3D 棋盘贴图的清单（本机提取过才有）：贴图在 public/assets/local 里，靠这份 JSON 才会被游戏采用。
  const localManifest = path.join(ROOT, LOCAL_ASSET_MANIFEST);
  const localTextures = path.join(ROOT, 'public', 'assets', 'local');
  if (fs.existsSync(localManifest)) {
    await fsp.copyFile(localManifest, path.join(appDir, LOCAL_ASSET_MANIFEST));
    console.log(`    Including ${LOCAL_ASSET_MANIFEST} (manifest for 3D board textures in public/assets/local)`);
  } else if (fs.existsSync(localTextures)) {
    console.log(`    ! public/assets/local exists, but ${LOCAL_ASSET_MANIFEST} is missing; the textures would be unused. `
      + 'Run node tools/setup.mjs --local to generate the manifest, or remove that directory.');
  }

  // 3) 生产依赖
  await installProductionDeps(appDir);
  const deps = await dirSize(path.join(appDir, 'node_modules'));
  console.log(`    Done: ${deps.files} files / ${MB(deps.bytes)} (production dependencies only)`);

  // 4) 便携版 Node（每次都从校验过的 zip 重新解压）
  let nodeInfo = { version: '(not bundled; install Node.js 22+ on the target PC)', bytes: 0 };
  if (o.node) {
    console.log(`  · Preparing portable Node.js ${nodeVersion}…`);
    await fsp.mkdir(nodeDir, { recursive: true });
    const zipPath = await ensureNodeZip(nodeVersion, nodeHash);
    nodeInfo = await extractPortableNode(nodeDir, nodeVersion, zipPath);
    console.log(`    Done: Node.js ${nodeInfo.version} / ${MB(nodeInfo.bytes)} + LICENSE`);
  }

  // 5) 包根的法律文件（本项目的 LICENSE / NOTICE / 第三方声明）
  for (const f of LEGAL_FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) {
      console.log(`    ! ${f} is missing from the repository; it will not be included in the bundle`);
      continue;
    }
    await fsp.copyFile(src, path.join(out, f));
  }

  await fsp.writeFile(path.join(out, 'Start-Game.bat'), bat('"%NODE%" "%HERE%app\\scripts\\launch.mjs" --no-setup %*'), 'latin1');
  await fsp.writeFile(path.join(out, 'README-Quickstart.md'), bundleReadme({ version: nodeVersion, withNode: !!o.node }), 'utf8');

  const total = await dirSize(out);
  console.log(`\n✔ Portable bundle created: ${out}\n  ${total.files} files / ${MB(total.bytes)}`);
  console.log('  Double-click Start-Game.bat to start a local game and open it in your browser.');
  return 0;
}

// 作为脚本运行时才打包（被 import 时只导出纯函数，方便测试）。
// 用 realpath 比较：路径经过符号链接（macOS 的 /tmp、Windows 的 8.3 短名）时 argv[1] 与 import.meta.url
// 的字面量不同，直接比 URL 会让脚本什么都不做就退出。
function isMain() {
  try {
    return !!process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch { return false; }
}

if (isMain()) main().then((code) => { process.exitCode = code ?? 0; }, (e) => { console.error(e?.stack || e); process.exitCode = 1; });
