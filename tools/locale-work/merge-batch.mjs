// Merge translated batches (JSON maps zh -> en) into the locale tables of every data file that has the text.
// usage: node merge-batch.mjs [--write] [--note "reviewed note for soft failures"] <out.json>...
import fs from 'node:fs';
import { readTable, writeTable, checkEntry, dataPath, sourcesOf } from '../locale.mjs';
import { LOCALE_FILES, collectSources } from '../../public/js/locale.js';
const args = process.argv.slice(2);
const write = args.includes('--write');
const noteIdx = args.indexOf('--note'); const note = noteIdx >= 0 ? args[noteIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--note');
const incoming = new Map();
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [zh, en] of Object.entries(j)) { if (incoming.has(zh) && incoming.get(zh) !== en) console.log('CONFLICT between batches:', JSON.stringify(zh), JSON.stringify(incoming.get(zh)), JSON.stringify(en)); incoming.set(zh, en); }
}
const sources = Object.fromEntries(LOCALE_FILES.filter((f) => fs.existsSync(dataPath(f))).map((f) => [f, new Set(sourcesOf(f).keys())]));
const tables = Object.fromEntries(LOCALE_FILES.filter((f) => sources[f]).map((f) => [f, readTable(f)]));
let applied = 0, unknown = [], hard = [], soft = [];
for (const [zh, en] of incoming) {
  const targets = Object.keys(sources).filter((f) => sources[f].has(zh));
  if (!targets.length) { unknown.push(zh); continue; }
  const r = checkEntry(zh, en);
  if (r.blocking.length || r.human.length) { hard.push([zh, en, [...r.blocking, ...r.human].join('; ')]); continue; }
  for (const f of targets) {
    tables[f].strings[zh] = en;
    if (r.review.length) { if (note) tables[f].reviewed[zh] = `${note}: ${r.review.join('; ')}`; else soft.push([zh, en, r.review.join('; ')]); }
    else delete tables[f].reviewed[zh];
  }
  if (!r.review.length || note) applied++;
}
console.log({ incoming: incoming.size, applied, unknownKeys: unknown.length, hardFailures: hard.length, needsReview: soft.length });
for (const u of unknown.slice(0, 20)) console.log('  UNKNOWN KEY (not a display text of any data file):', JSON.stringify(u).slice(0, 80));
for (const h of hard) console.log('  HARD:', JSON.stringify(h).slice(0, 300));
for (const s of soft) console.log('  REVIEW:', JSON.stringify(s).slice(0, 300));
if (write) for (const f of Object.keys(tables)) writeTable(f, tables[f]);
console.log(write ? 'written' : 'dry run (add --write)');
