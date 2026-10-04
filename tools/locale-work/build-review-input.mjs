// Build the input of a descriptions reviewer: the (zh, en) pairs of the given data files' DESCRIPTION texts.
// usage: node build-review-input.mjs <outfile> <file1,file2,...> [chunkStart chunkEnd]
import fs from 'node:fs';
import { readTable, dataPath, sourcesOf, LOCALE_DIR } from '../locale.mjs';
import { TEXT_KEYS } from '../../public/js/locale.js';
import { richTextPlain } from '../../public/js/ui/richText.js';
import { WORK, readWork, EMPTY_OFFICIAL } from './paths.mjs';
const [outFile, fileList] = process.argv.slice(2);
const files = fileList.split(',');
const NAME = new Set(['name', 'effectName', 'seasonName', 'subProfessionName', 'eventTypeDesc', 'label', 'title']);
const official = readWork('official-names.json', EMPTY_OFFICIAL);
const ref = new Map();
for (const g of ['operators', 'enemies', 'skills', 'modules', 'terms']) for (const [z, e] of Object.entries(official[g])) if (z.length >= 2 && !ref.has(z)) ref.set(z, e);
const all = {};
for (const f of fs.readdirSync(LOCALE_DIR)) { const t = readTable(f.replace(/\.json$/, '')); const j = JSON.parse(fs.readFileSync(dataPath(f.replace(/\.json$/, '')), 'utf8')); all[f] = { t, j }; }
// names already translated (name-like fields) as refs
for (const [f, { t, j }] of Object.entries(all)) {
  const walk = (v, key) => { if (typeof v === 'string') { if (NAME.has(key) && t.strings[v] && v.length >= 2) ref.set(v, t.strings[v]); } else if (Array.isArray(v)) v.forEach((x) => walk(x, key)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k); };
  walk(j, '');
}
const refKeys = [...ref.keys()].sort((a, b) => b.length - a.length);
const refHits = (zh) => { const hits = {}; let rest = zh; for (const k of refKeys) { if (k === zh) continue; if (rest.includes(k)) { hits[k] = ref.get(k); rest = rest.split(k).join('\u0000'); } if (Object.keys(hits).length >= 10) break; } return hits; };
const entries = [];
const seen = new Set();
for (const f of files) {
  const { t } = all[`${f}.json`];
  const sources = sourcesOf(f);
  // where: first two records holding the text, with their names
  const where = new Map();
  const walk = (o, rec) => {
    if (Array.isArray(o)) { o.forEach((x) => { if (x && typeof x === 'object') walk(x, rec); }); return; }
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') { if (TEXT_KEYS.includes(k) && sources.has(v)) { const w = where.get(v) || where.set(v, []).get(v); if (w.length < 2) w.push({ at: `${f}:${rec}.${k}`, name: typeof o.name === 'string' ? o.name : undefined }); } }
      else if (v && typeof v === 'object') walk(v, rec || k);
    }
  };
  const j = all[`${f}.json`].j;
  for (const [k, v] of Object.entries(j)) if (v && typeof v === 'object') walk(v, k);
  for (const [zh, keys] of sources) {
    if (seen.has(zh)) continue;
    if ([...keys].every((k) => NAME.has(k))) continue; // names were reviewed separately
    const en = t.strings[zh]; if (!en) continue;
    seen.add(zh);
    entries.push({ zh, en, files: [f], where: where.get(zh) || [], refs: refHits(zh) });
  }
}
fs.writeFileSync(outFile, JSON.stringify({ files, entries }, null, 1));
console.log(`${entries.length} entries, ${entries.reduce((a, e) => a + e.zh.length, 0)} Chinese chars → ${outFile}`);
