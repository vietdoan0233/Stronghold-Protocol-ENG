// Self-check of a translated batch: node check-batch.mjs <out.json> [<batch.json> ...]
// Reports: keys that are not in the given batches (typos), missing entries, blocking problems (Chinese left, placeholder /
// number mismatch) and "review" problems (tag / condition / newline / numbers-in-words differences).
import fs from 'node:fs';
import { checkEntry } from '../locale.mjs';
const [outFile, ...batchFiles] = process.argv.slice(2);
const out = JSON.parse(fs.readFileSync(outFile, 'utf8'));
const want = new Set();
for (const b of batchFiles) for (const e of JSON.parse(fs.readFileSync(b, 'utf8')).entries) want.add(e.zh);
let bad = 0, review = 0;
const say = (kind, zh, msg) => console.log(`${kind}: ${JSON.stringify(zh).slice(0, 90)}\n    ${msg}`);
for (const [zh, en] of Object.entries(out)) {
  if (want.size && !want.has(zh)) { say('UNKNOWN KEY (not copied exactly from the batch?)', zh, ''); bad++; continue; }
  if (typeof en !== 'string' || !en.trim()) { say('EMPTY', zh, ''); bad++; continue; }
  const r = checkEntry(zh, en);
  for (const p of [...r.blocking, ...r.human]) { say('PROBLEM', zh, `${p}\n    → ${JSON.stringify(en).slice(0, 160)}`); bad++; }
  for (const p of r.review) { say('REVIEW', zh, `${p}\n    → ${JSON.stringify(en).slice(0, 160)}`); review++; }
}
for (const w of want) if (!(w in out)) { say('MISSING', w, ''); bad++; }
console.log(`${Object.keys(out).length} entries; ${bad} problem(s), ${review} to double-check (tags / conditions / newlines / numbers written as words: fix, or keep and mention in your report)`);
process.exitCode = bad ? 1 : 0;
