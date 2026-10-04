// Check a reviewer's corrections file { zh: { en, why } }: every key must be a display text of some data file (or a derived
// source) and every `en` must pass the blocking / human checks. usage: node check-fixes.mjs <fixes.json>
import fs from 'node:fs';
import { checkEntry, sourcesOf } from '../locale.mjs';
import { LOCALE_FILES } from '../../public/js/locale.js';
const fixes = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const known = new Set(); for (const f of LOCALE_FILES) { try { for (const k of sourcesOf(f).keys()) known.add(k); } catch { /* no data file */ } }
let bad = 0, review = 0;
for (const [zh, v] of Object.entries(fixes)) {
  const en = typeof v === 'string' ? v : v && v.en;
  if (!known.has(zh)) { console.log(`UNKNOWN KEY (copied inexactly?): ${JSON.stringify(zh).slice(0, 90)}`); bad++; continue; }
  if (typeof en !== 'string' || !en.trim()) { console.log(`EMPTY: ${JSON.stringify(zh).slice(0, 90)}`); bad++; continue; }
  const r = checkEntry(zh, en);
  for (const p of [...r.blocking, ...r.human]) { console.log(`PROBLEM: ${JSON.stringify(zh).slice(0, 80)}\n    ${p}\n    → ${JSON.stringify(en).slice(0, 160)}`); bad++; }
  for (const p of r.review) { console.log(`REVIEW: ${JSON.stringify(zh).slice(0, 80)}\n    ${p}\n    → ${JSON.stringify(en).slice(0, 160)}`); review++; }
}
console.log(`${Object.keys(fixes).length} correction(s); ${bad} problem(s), ${review} to double-check`);
process.exitCode = bad ? 1 : 0;
