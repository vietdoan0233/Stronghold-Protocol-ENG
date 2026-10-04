// usage: node apply-fixes.mjs <fix.json> [more.json ...]   — fix.json: { "<zh>": { "en": "...", "why": "..." } }
// Sets strings[zh] = en in every table that has the key (no new keys are created). Reports what changed.
import fs from 'node:fs';
import { LOCALE_FILES } from '../../public/js/locale.js';
import { readTable, writeTable, checkEntry } from '../locale.mjs';
const fixes = {};
for (const f of process.argv.slice(2)) Object.assign(fixes, JSON.parse(fs.readFileSync(f, 'utf8')));
const touched = new Map();
let changed = 0, missing = new Set(Object.keys(fixes));
for (const file of LOCALE_FILES) {
  let t; try { t = readTable(file); } catch { continue; }
  let dirty = false;
  for (const [zh, v] of Object.entries(fixes)) {
    if (!(zh in t.strings)) continue;
    missing.delete(zh);
    const en = typeof v === 'string' ? v : v.en;
    if (t.strings[zh] === en) continue;
    const r = checkEntry(zh, en);
    if (r.blocking.length) { console.log(`BLOCKED ${file}: ${zh} -> ${en}: ${r.blocking.join('; ')}`); continue; }
    console.log(`${file}: ${JSON.stringify(zh).slice(0, 50)}: ${JSON.stringify(t.strings[zh]).slice(0, 60)} -> ${JSON.stringify(en).slice(0, 60)}`);
    t.strings[zh] = en; dirty = true; changed++;
  }
  if (dirty) writeTable(file, t);
}
console.log(`${changed} change(s)`);
if (missing.size) console.log('keys not found in any table:', [...missing].map((k) => JSON.stringify(k).slice(0, 60)).join(', '));
