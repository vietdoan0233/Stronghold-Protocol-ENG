// Build translation batches of the still-untranslated display texts, with context and reference hits.
// usage: node build-batches.mjs <names|descs> <outdir> [chunkSize]
import fs from 'node:fs';
import path from 'node:path';
import { coverage, readTable, dataPath, LOCALE_DIR } from '../locale.mjs';
import { LOCALE_FILES, TEXT_KEYS } from '../../public/js/locale.js';
import { richTextPlain } from '../../public/js/ui/richText.js';
import { WORK, readWork, EMPTY_OFFICIAL } from './paths.mjs';
const kind = process.argv[2]; const outDir = process.argv[3]; const chunk = Number(process.argv[4] || 90);
const NAME = new Set(['name', 'effectName', 'seasonName', 'subProfessionName', 'eventTypeDesc', 'label', 'title']);
const PR = [['desc', 'descRaw'], ['moduleDesc', 'moduleDescRaw'], ['effectDesc', 'effectDescRaw'], ['text', 'textRaw']];
const KEYS = new Set(TEXT_KEYS);
const official = readWork('official-names.json', EMPTY_OFFICIAL);
const docPairs = new Map(readWork('doc-name-pairs.json', []).map(([z, e]) => [z, e[0]]));
// reference dictionary: official operators / enemies / skills / modules / terms + names already translated in the tables + doc names
const ref = new Map();
for (const group of ['operators', 'enemies', 'skills', 'modules', 'terms']) for (const [z, e] of Object.entries(official[group])) if (z.length >= 2 && !ref.has(z)) ref.set(z, e);
for (const [z, e] of docPairs) if (z.length >= 2 && /^[\x20-\x7e’']+$/.test(e) && !/^enemy_/.test(e)) ref.set(z, e);
const nameFields = new Map(); // zh -> en for name-like fields already in tables
for (const f of LOCALE_FILES) {
  if (!fs.existsSync(dataPath(f))) continue;
  const t = readTable(f);
  const walk = (v, key) => { if (typeof v === 'string') { if (NAME.has(key) && t.strings[v]) nameFields.set(v, t.strings[v]); } else if (Array.isArray(v)) v.forEach((x) => walk(x, key)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k); };
  walk(JSON.parse(fs.readFileSync(dataPath(f), 'utf8')), '');
}
for (const [z, e] of nameFields) if (z.length >= 2) ref.set(z, e);
const refKeys = [...ref.keys()].sort((a, b) => b.length - a.length);
function refHits(zh) {
  const hits = {}; let rest = zh;
  for (const k of refKeys) { if (k === zh) continue; if (rest.includes(k)) { hits[k] = ref.get(k); rest = rest.split(k).join('\u0000'); } if (Object.keys(hits).length >= 12) break; }
  return hits;
}
// first occurrences with context
const missing = new Map();
for (const r of coverage()) for (const m of r.missing) { const e = missing.get(m.zh) || { zh: m.zh, files: [], keys: new Set() }; e.files.push(r.file); m.keys.forEach((k) => e.keys.add(k)); missing.set(m.zh, e); }
const where = new Map();
for (const f of LOCALE_FILES) {
  if (!fs.existsSync(dataPath(f))) continue;
  const walk = (o, p, rec) => {
    if (Array.isArray(o)) { o.forEach((x, i) => { if (x && typeof x === 'object') walk(x, p + '[]', rec); }); return; }
    const followers = new Set();
    for (const [pk, rk] of PR) if (typeof o[rk] === 'string' && typeof o[pk] === 'string' && richTextPlain(o[rk]).replace(/\r\n?/g, '\n') === o[pk].replace(/\r\n?/g, '\n')) followers.add(pk);
    const sib = {};
    const ctxText = o.descRaw || o.desc || o.effectDescRaw || o.effectDesc || o.textRaw || o.text;
    if (typeof ctxText === 'string') sib.desc = ctxText.slice(0, 200);
    if (typeof o.unlockDesc === 'string') sib.unlock = o.unlockDesc;
    if (typeof o.name === 'string' && o.name) sib.name = o.name;
    for (const [k, v] of Object.entries(o)) {
      const rp = p ? `${p}.${k}` : k;
      if (typeof v === 'string') { if (KEYS.has(k) && !followers.has(k) && missing.has(v)) { const w = where.get(v) || where.set(v, []).get(v); if (w.length < 3) w.push({ at: `${f}:${rec || rp}${rec ? '.' + k : ''}`, field: k, ctx: sib }); } }
      else if (Array.isArray(v) && KEYS.has(k) && v.some((x) => typeof x === 'string')) { for (const x of v) if (typeof x === 'string' && missing.has(x)) { const w = where.get(x) || where.set(x, []).get(x); if (w.length < 3) w.push({ at: `${f}:${rec || rp}`, field: k, ctx: sib }); } }
      else if (v && typeof v === 'object') walk(v, rp, rec || (p === '' ? rp : ''));
    }
  };
  const data = JSON.parse(fs.readFileSync(dataPath(f), 'utf8'));
  for (const [k, v] of Object.entries(data)) { if (v && typeof v === 'object') walk(v, k, `${k}`); }
}
const wantName = kind === 'names';
const entries = [];
for (const e of missing.values()) {
  const isName = [...e.keys].every((k) => NAME.has(k));
  if (isName !== wantName) continue;
  entries.push({ zh: e.zh, files: [...new Set(e.files)], fields: [...e.keys], where: (where.get(e.zh) || []).map((w) => ({ at: w.at, field: w.field, ...w.ctx })), refs: refHits(e.zh) });
}
// domains: names → by primary file; descs → by primary file
const PRI = ['bands', 'bonds', 'factions', 'config', 'stages', 'emotes', 'items', 'choices', 'chess', 'enemies', 'bosses', 'tokens', 'garrisons', 'effects'];
const dom = (e) => PRI.find((f) => e.files.includes(f)) || e.files[0];
const byDom = new Map();
for (const e of entries) { const d = dom(e); (byDom.get(d) || byDom.set(d, []).get(d)).push(e); }
fs.mkdirSync(outDir, { recursive: true });
const summary = [];
for (const [d, list] of byDom) {
  for (let i = 0; i < list.length; i += chunk) {
    const part = list.slice(i, i + chunk); const name = `${kind}-${d}-${String(i / chunk + 1).padStart(2, '0')}`;
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ task: kind, domain: d, entries: part }, null, 1));
    summary.push([name, part.length, part.reduce((a, e) => a + e.zh.length, 0)]);
  }
}
for (const s of summary) console.log(s.join('\t'));
console.log('total', entries.length);
