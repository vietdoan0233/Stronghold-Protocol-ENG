// Advisory check: in a description translation, a Chinese NAME that occurs in the source must appear (by its English name) in
// the English. usage: node name-consistency.mjs <out.json> [...]   (out.json: { zh: en })
// Names come from the overlay tables (name-like fields of the data files) + the official dictionaries.
import fs from 'node:fs';
import { LOCALE_FILES, TEXT_KEYS } from '../../public/js/locale.js';
import { readTable, dataPath } from '../locale.mjs';
import { WORK, readWork, EMPTY_OFFICIAL } from './paths.mjs';
const NAME = new Set(['name', 'effectName', 'seasonName', 'subProfessionName', 'eventTypeDesc', 'label', 'title']);
const official = readWork('official-names.json', EMPTY_OFFICIAL);
const names = new Map(); // zh -> Set(en)
const add = (z, e) => { if (z.length < 2 || !e || /[一-鿿]/.test(e)) return; (names.get(z) || names.set(z, new Set()).get(z)).add(e); };
for (const g of ['operators', 'enemies', 'skills', 'modules']) for (const [z, e] of Object.entries(official[g])) add(z, e);
for (const f of LOCALE_FILES) {
  if (!fs.existsSync(dataPath(f))) continue;
  const t = readTable(f);
  const walk = (v, key) => { if (typeof v === 'string') { if (NAME.has(key) && t.strings[v]) add(v, t.strings[v]); } else if (Array.isArray(v)) v.forEach((x) => walk(x, key)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k); };
  walk(JSON.parse(fs.readFileSync(dataPath(f), 'utf8')), '');
}
const keys = [...names.keys()].sort((a, b) => b.length - a.length);
let problems = 0, files = 0;
for (const file of process.argv.slice(2)) {
  files++;
  const out = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [zh, en] of Object.entries(out)) {
    let rest = zh;
    for (const k of keys) {
      if (!rest.includes(k)) continue;
      rest = rest.split(k).join('\u0000');
      const ens = [...names.get(k)];
      const low = en.toLowerCase();
      if (!ens.some((e) => low.includes(e.toLowerCase().replace(/’/g, "'")) || low.includes(e.toLowerCase()))) {
        // skip generic words that are also names (e.g. 近卫 / 医疗 …) — only report names of >= 3 chars or in brackets
        if (k.length < 3 && !zh.includes(`【${k}】`) && !zh.includes(`<${k}>`)) continue;
        console.log(`${JSON.stringify(zh).slice(0, 80)}\n    ${k} → ${ens.join(' | ')}   missing in: ${JSON.stringify(en).slice(0, 160)}`);
        problems++;
      }
    }
  }
}
console.log(`${files} file(s), ${problems} name(s) not found in the English`);
