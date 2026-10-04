// Pair the quoted terms of the pre-localization Chinese docs (git history, before the commit 'Localize to English') with the
// English docs line by line: the names the docs already settled, as reference for the translators.
// usage: node tools/locale-work/doc-names.mjs [out.json]   (default <work>/doc-name-pairs.json)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, WORK } from './paths.mjs';
const outFile = process.argv[2] || path.join(WORK, 'doc-name-pairs.json');
const docs = ['README.md', 'docs/PLAYING.md', 'docs/BALANCE.md', 'docs/DEPLOY.md', 'docs/ASSETS.md', 'NOTICE.md', 'docs/DATA.md', 'CHANGELOG.md'];
const zhRe = /[「【“]([^」】”\n]{1,40})[」】”]/g;
const enRe = /(?:["“]|\[(?!\S*\]\())([^"”\]\n]{1,60})(?:["”]|\](?!\())/g;
const pairs = new Map();
let linesOK = 0, linesSkipped = 0;
for (const d of docs) {
  let zh; try { zh = execSync(`git show e8fd929^:${d}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n'); } catch { continue; }
  const en = fs.readFileSync(path.join(ROOT, d), 'utf8').split('\n');
  if (Math.abs(zh.length - en.length) > 6) { console.log('skip (not aligned):', d, zh.length, en.length); continue; }
  const n = Math.min(zh.length, en.length);
  for (let i = 0; i < n; i++) {
    const zt = [...zh[i].matchAll(zhRe)].map((m) => m[1].trim());
    const et = [...en[i].matchAll(enRe)].map((m) => m[1].trim());
    if (!zt.length) continue;
    if (zt.length !== et.length) { linesSkipped++; continue; }
    linesOK++;
    zt.forEach((z, k) => { const m = pairs.get(z) || new Map(); m.set(et[k], (m.get(et[k]) || 0) + 1); pairs.set(z, m); });
  }
}
const out = [...pairs].map(([z, m]) => [z, [...m].sort((a, b) => b[1] - a[1]).map((x) => x[0])]);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out));
console.log('lines paired', linesOK, 'skipped', linesSkipped, 'terms', out.length);
