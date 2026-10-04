#!/usr/bin/env node
// tools/locale.mjs — maintenance of the English overlay (public/locales/en/<data file>.json; mechanism: public/js/locale.js,
// workflow and glossary: docs/LOCALE.md, docs/GLOSSARY.md).
//
// Usage: node tools/locale.mjs <command> [options]
//   coverage [--files a,b] [--list] [--strict a,b]  display texts of data/*.json that have no English yet
//                                                    (--strict: exit 1 when one of the named files is not complete)
//   check [--terms]                                  validate every table: markup tags, {n:fmt} placeholders, numbers, newlines,
//                                                    literal <conditions>, leftover Chinese, stale / orphan keys, consistency
//                                                    between tables (--terms: glossary lint, warnings only)
//   sync [--write]                                   give every table the translation another table already has for the same text
//   harvest [--write] [--refresh] [--overwrite]      the official Arknights Global (en_US) wording for everything it covers:
//                                                    the build pipeline re-run over the English operator / enemy / skill tables
//                                                    (the mode's own tables stay Chinese), aligned with data/*.json by path
//
// A table entry may fail a check on purpose (the official English drops a highlight tag, "三个" becomes "3"): such an entry
// is listed in the table's `reviewed` object with the reason, and stays valid. Two kinds of failure are never accepted:
// a number of the Chinese text that is missing from the English (a stale official snapshot: "-15%" vs "-25%"), and a
// {n:fmt} placeholder that does not survive.

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, mkdtempSync, copyFileSync, cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALE_FILES, collectSources, TEXT_KEYS } from '../public/js/locale.js';
import { richTextPlain } from '../public/js/ui/richText.js';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = join(ROOT, 'data');
export const LOCALE_DIR = join(ROOT, 'public', 'locales', 'en');
const CACHE_ZH = join(ROOT, '.cache', 'gamedata');
const CACHE_EN = join(ROOT, '.cache', 'gamedata-en');
const EN_URL = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/';

// ===== tables ====================================================================================================

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const dataPath = (file) => join(DATA_DIR, `${file}.json`);
export const tablePath = (file) => join(LOCALE_DIR, `${file}.json`);

/** @returns {{ locale: 'en', strings: Record<string,string>, reviewed: Record<string,string> }} */
export function readTable(file) {
  const p = tablePath(file);
  const t = existsSync(p) ? readJson(p) : {};
  return { locale: 'en', strings: t.strings && typeof t.strings === 'object' ? { ...t.strings } : {}, reviewed: t.reviewed && typeof t.reviewed === 'object' ? { ...t.reviewed } : {} };
}

/**
 * A table in its canonical text form: one entry per line, in the order the source texts first appear in the data file
 * (names beside their descriptions, record by record); entries the data no longer has come last, sorted.
 * @param {{ strings: Record<string,string>, reviewed?: Record<string,string> }} table
 * @param {string[]} order the source texts of the data file in order of appearance (collectSources keys)
 */
export function serializeTable(table, order) {
  const pos = new Map(order.map((k, i) => [k, i]));
  const rank = (k) => (pos.has(k) ? pos.get(k) : 1e9);
  const by = (a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0);
  const line = (k, v) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  const keys = Object.keys(table.strings).sort(by);
  const rev = Object.keys(table.reviewed || {}).filter((k) => k in table.strings).sort(by);
  const out = ['{', '  "locale": "en",', '  "strings": {', keys.map((k) => line(k, table.strings[k])).join(',\n'), rev.length ? '  },' : '  }'];
  if (rev.length) out.push('  "reviewed": {', rev.map((k) => line(k, table.reviewed[k])).join(',\n'), '  }');
  out.push('}', '');
  return out.join('\n');
}

/** Write a table of a data file in its canonical form (serializeTable). */
export function writeTable(file, table) {
  mkdirSync(LOCALE_DIR, { recursive: true });
  writeFileSync(tablePath(file), serializeTable(table, [...collectSources(readJson(dataPath(file))).keys()]));
}

// ===== validation ================================================================================================

const TAG_RE = /<[@$][A-Za-z0-9_.\-]{1,48}>|<\/>/g;
const PH_RE = /\{\d{1,2}(?::[^{}]{0,12})?\}/g;
const COND_RE = /<(?![@$/])[^<>\n]{1,80}>/g;
const CJK_RE = /[　-〿぀-ヿ一-鿿＀-￯]/;
const HAN_RE = /[一-鿿぀-ヿ]/;

const counts = (a) => { const m = new Map(); for (const x of a) m.set(x, (m.get(x) || 0) + 1); return m; };
const sameBag = (a, b) => { const A = counts(a); const B = counts(b); return A.size === B.size && [...A].every(([k, v]) => B.get(k) === v); };
const strip = (s) => s.replace(TAG_RE, ' ').replace(PH_RE, ' ');
const numbersOf = (s) => strip(s).replace(/(\d),(?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?/g) || [];

/**
 * What differs between a source text and its translation.
 * @param {string} zh @param {string} en
 * @returns {{ blocking: string[], human: string[], review: string[] }} blocking: never acceptable; human: a number of the source
 *   is missing (stale official English, or a number written as a word) — only a person can tell, so it is never accepted
 *   automatically; review: acceptable once listed under `reviewed`
 */
export function checkEntry(zh, en) {
  const blocking = [];
  const human = [];
  const review = [];
  if (typeof en !== 'string' || !en.trim()) return { blocking: ['blank'], human, review };
  if (CJK_RE.test(en)) blocking.push('Chinese or full-width characters left in the English');
  if (/^\s/.test(en) !== /^\s/.test(zh) || /\s$/.test(en) !== /\s$/.test(zh)) review.push('leading / trailing whitespace differs');
  if (!sameBag(zh.match(PH_RE) || [], en.match(PH_RE) || [])) blocking.push(`placeholders ${JSON.stringify(zh.match(PH_RE) || [])} → ${JSON.stringify(en.match(PH_RE) || [])}`);
  if (!sameBag(zh.match(TAG_RE) || [], en.match(TAG_RE) || [])) review.push('markup tags differ');
  if ((zh.match(COND_RE) || []).length !== (en.match(COND_RE) || []).length) review.push('<condition> markers differ');
  if ((zh.match(/\n/g) || []).length !== (en.match(/\n/g) || []).length) review.push('line breaks differ');
  const nz = numbersOf(zh);
  const ne = numbersOf(en);
  if (!sameBag(nz, ne)) {
    const E = counts(ne);
    const missing = [...counts(nz)].filter(([k, v]) => (E.get(k) || 0) < v).map(([k]) => k);
    if (missing.length) human.push(`number(s) ${missing.join(', ')} of the source are missing in the English`);
    else review.push('the English has numbers the source writes in words');
  }
  return { blocking, human, review };
}

/** Terms whose English must be used consistently: [Chinese, regexp the English must match (case-insensitive)]. Warnings only. */
export const TERMS = [
  ['盟约', /alliance|\bband\b|\bbond/i], ['联防', /unite|uniting/i], ['机变', /draft/i], ['整备区', /reserve/i],
  ['调度中心', /dispatch center/i], ['休整期', /rest phase/i], ['资金', /fund/i], ['最终攻势', /final assault/i],
  ['隐秘核心', /hidden core/i], ['悬赏', /bount/i], ['机密商店', /secret shop/i], ['战术决策', /tactical decision/i],
  ['部署点数', /\bdp\b|deployment point/i], ['精锐', /elite/i],
];

/** Check every table: returns { errors, warnings } (strings). `terms`: add the glossary lint to the warnings. */
export function checkTables({ terms = false } = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Map(); // zh → { en, file }
  for (const file of LOCALE_FILES) {
    if (!existsSync(tablePath(file))) continue;
    const t = readTable(file);
    const sources = collectSources(readJson(dataPath(file)));
    for (const [zh, en] of Object.entries(t.strings)) {
      const where = `${file}: ${JSON.stringify(zh).slice(0, 70)}`;
      if (!sources.has(zh)) errors.push(`${where} — no display field of data/${file}.json has this text (renamed or reworded in a rebuild?)`);
      const { blocking, human, review } = checkEntry(zh, en);
      for (const b of blocking) errors.push(`${where} — ${b}`);
      const soft = [...human, ...review];
      if (soft.length && !(zh in t.reviewed)) errors.push(`${where} — ${soft.join('; ')} (fix it, or list the entry under "reviewed" with the reason)`);
      if (!soft.length && zh in t.reviewed) warnings.push(`${where} — listed under "reviewed" but passes every check`);
      const prev = seen.get(zh);
      if (prev && prev.en !== en) errors.push(`${where} — translated differently in ${prev.file}.json (${JSON.stringify(prev.en).slice(0, 60)})`);
      else if (!prev) seen.set(zh, { en, file });
      if (terms) for (const [term, re] of TERMS) if (zh.includes(term) && !re.test(en)) warnings.push(`${where} — contains ${term} but the English lacks ${re}`);
    }
    for (const zh of Object.keys(t.reviewed)) if (!(zh in t.strings)) errors.push(`${file}: "reviewed" entry without a translation: ${JSON.stringify(zh).slice(0, 70)}`);
  }
  return { errors, warnings };
}

// ===== coverage ==================================================================================================

/** @returns {{ file: string, total: number, done: number, missing: Array<{ zh: string, keys: string[] }>, missingChars: number }[]} */
export function coverage(files = LOCALE_FILES) {
  return files.filter((f) => existsSync(dataPath(f))).map((file) => {
    const sources = collectSources(readJson(dataPath(file)));
    const { strings } = readTable(file);
    const missing = [...sources].filter(([zh]) => !(zh in strings)).map(([zh, keys]) => ({ zh, keys: [...keys] }));
    return { file, total: sources.size, done: sources.size - missing.length, missing, missingChars: missing.reduce((a, m) => a + m.zh.length, 0) };
  });
}

// ===== sync ======================================================================================================

/** Translations shared by several tables: for every Chinese text one table has, fill the tables that lack it. */
export function planSync() {
  const have = new Map(); // zh → Map(en → file)
  const tables = new Map();
  for (const file of LOCALE_FILES) {
    if (!existsSync(tablePath(file))) continue;
    const t = readTable(file);
    tables.set(file, t);
    for (const [zh, en] of Object.entries(t.strings)) (have.get(zh) || have.set(zh, new Map()).get(zh)).set(en, file);
  }
  const adds = [];
  const conflicts = [];
  for (const file of LOCALE_FILES) {
    if (!existsSync(dataPath(file))) continue;
    const t = tables.get(file) || readTable(file);
    for (const zh of collectSources(readJson(dataPath(file))).keys()) {
      if (zh in t.strings) continue;
      const opts = have.get(zh);
      if (!opts) continue;
      if (opts.size > 1) conflicts.push({ file, zh, options: [...opts] });
      else adds.push({ file, zh, en: [...opts.keys()][0], from: [...opts.values()][0] });
    }
  }
  return { adds, conflicts, tables };
}

// ===== harvest ===================================================================================================

const NEEDED_EN = ['excel/character_table.json', 'excel/skill_table.json', 'excel/uniequip_table.json', 'excel/range_table.json',
  'excel/enemy_handbook_table.json', 'excel/battle_equip_table.json', 'levels/enemydata/enemy_database.json'];

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  let last;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      JSON.parse(text);
      writeFileSync(dest, text);
      return;
    } catch (e) { last = e; await new Promise((r) => setTimeout(r, 500 * attempt)); }
  }
  throw new Error(`cannot download ${url}: ${last?.message}`);
}

/** Build the data with the English operator / enemy / skill tables (the mode's own tables stay Chinese). @returns {string} output dir */
async function buildEnglishData({ refresh }) {
  for (const rel of NEEDED_EN) {
    const dest = join(CACHE_EN, rel);
    if (refresh || !existsSync(dest)) { console.log(`  download en_US/${rel}`); await download(EN_URL + rel, dest); }
  }
  if (!existsSync(join(CACHE_ZH, 'excel', 'activity_table.json'))) {
    console.log('  filling the Chinese cache (node tools/build-data.mjs) …');
    const tmp = mkdtempSync(join(tmpdir(), 'sp-zh-'));
    const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'build-data.mjs'), '--out', tmp, '--report', join(tmp, 'report.json'), '--quiet'], { stdio: 'inherit' });
    rmSync(tmp, { recursive: true, force: true });
    if (r.status !== 0) throw new Error('tools/build-data.mjs failed');
  }
  const work = mkdtempSync(join(tmpdir(), 'sp-hybrid-'));
  for (const rel of NEEDED_EN) { mkdirSync(dirname(join(work, rel)), { recursive: true }); copyFileSync(join(CACHE_EN, rel), join(work, rel)); }
  mkdirSync(join(work, 'excel'), { recursive: true });
  copyFileSync(join(CACHE_ZH, 'excel', 'activity_table.json'), join(work, 'excel', 'activity_table.json'));
  cpSync(join(CACHE_ZH, 'levels', 'activities'), join(work, 'levels', 'activities'), { recursive: true });
  const out = join(work, 'out');
  mkdirSync(out);
  // integrity errors about records the English tables lack are expected: --force writes the output anyway
  const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'build-data.mjs'), '--offline', '--cache', work, '--out', out, '--report', join(work, 'report.json'), '--force', '--quiet'], { encoding: 'utf8' });
  if (!existsSync(join(out, 'chess.json'))) throw new Error(`the English build failed:\n${r.stdout}\n${r.stderr}`);
  return out;
}

const ID_LIKE = /^(enemy|token|char|chess|skchr|sktok|uniequip|trap|act\d)[a-z0-9_]*_[a-z0-9_]+$/i;

/**
 * Pairs (zh display text → official English) of one data file, aligned by path with the English build of it.
 * @returns {{ pairs: Map<string, Map<string, number>>, mismatched: number }}
 */
function alignPairs(zhJson, enJson) {
  const pairs = new Map();
  let mismatched = 0;
  const KEYS = new Set(TEXT_KEYS);
  const PR = [['desc', 'descRaw'], ['moduleDesc', 'moduleDescRaw'], ['effectDesc', 'effectDescRaw'], ['text', 'textRaw']];
  const add = (zh, en) => {
    if (typeof en !== 'string' || !HAN_RE.test(zh) || HAN_RE.test(en) || en === zh || !en.trim() || ID_LIKE.test(en.trim())) return;
    const m = pairs.get(zh) || pairs.set(zh, new Map()).get(zh);
    m.set(en, (m.get(en) || 0) + 1);
  };
  const walk = (a, b) => {
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) { mismatched++; return; }
      if (a.length !== b.length) mismatched++;
      a.forEach((x, i) => { if (x && typeof x === 'object') walk(x, b[i]); });
      return;
    }
    if (!a || typeof a !== 'object') return;
    if (!b || typeof b !== 'object') { mismatched++; return; }
    const followers = new Set();
    for (const [pk, rk] of PR) {
      if (typeof a[rk] === 'string' && typeof a[pk] === 'string' && richTextPlain(a[rk]).replace(/\r\n?/g, '\n') === a[pk].replace(/\r\n?/g, '\n')) followers.add(pk);
    }
    for (const [k, v] of Object.entries(a)) {
      if (typeof v === 'string') { if (KEYS.has(k) && !followers.has(k)) add(v, b[k]); }
      else if (Array.isArray(v) && KEYS.has(k) && v.some((x) => typeof x === 'string')) {
        if (!Array.isArray(b[k]) || b[k].length !== v.length) { mismatched++; continue; }
        v.forEach((x, i) => { if (typeof x === 'string') add(x, b[k][i]); });
      } else if (v && typeof v === 'object') walk(v, b[k]);
    }
  };
  walk(zhJson, enJson);
  return { pairs, mismatched };
}

export async function harvest({ write = false, refresh = false, overwrite = false } = {}) {
  console.log('building the data with the English official tables …');
  const out = await buildEnglishData({ refresh });
  const report = [];
  for (const file of LOCALE_FILES) {
    const enPath = join(out, `${file}.json`);
    if (!existsSync(enPath) || !existsSync(dataPath(file))) continue;
    const zhJson = readJson(dataPath(file));
    const { pairs, mismatched } = alignPairs(zhJson, readJson(enPath));
    const t = readTable(file);
    const sources = collectSources(zhJson);
    const row = { file, added: 0, kept: 0, differ: [], stale: [], reviewed: 0, ambiguous: 0, mismatched };
    for (const [zh, options] of pairs) {
      if (!sources.has(zh)) continue; // a plain text that follows its raw one, or not a display field
      const ranked = [...options].sort((a, b) => b[1] - a[1]);
      if (ranked.length > 1) row.ambiguous++;
      const en = ranked[0][0];
      if (zh in t.strings && !overwrite) { if (t.strings[zh] !== en) row.differ.push(zh); row.kept++; continue; }
      const { blocking, human, review } = checkEntry(zh, en);
      if (blocking.length || human.length) { row.stale.push({ zh, en, why: [...blocking, ...human].join('; ') }); continue; }
      t.strings[zh] = en;
      if (review.length) { t.reviewed[zh] = `official English: ${review.join('; ')}`; row.reviewed++; } else delete t.reviewed[zh];
      row.added++;
    }
    report.push(row);
    if (write && (row.added || overwrite)) writeTable(file, t);
  }
  rmSync(dirname(out), { recursive: true, force: true });
  return report;
}

// ===== CLI =======================================================================================================

function printCoverage(rows, list) {
  let miss = 0;
  let chars = 0;
  for (const r of rows) {
    miss += r.missing.length;
    chars += r.missingChars;
    console.log(`${r.file.padEnd(10)} ${String(r.done).padStart(5)} / ${String(r.total).padEnd(5)} translated   missing ${String(r.missing.length).padStart(5)} (${r.missingChars} chars)`);
    if (list) for (const m of r.missing) console.log(`    ${JSON.stringify(m.zh)}  [${m.keys.join(',')}]`);
  }
  console.log(`TOTAL missing ${miss} (${chars} chars)`);
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  const flag = (name) => rest.includes(name);
  const opt = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };
  if (cmd === 'coverage') {
    const files = opt('--files') ? opt('--files').split(',') : LOCALE_FILES;
    const rows = coverage(files);
    printCoverage(rows, flag('--list'));
    const strict = opt('--strict');
    if (strict) {
      const bad = rows.filter((r) => strict.split(',').includes(r.file) && r.missing.length);
      if (bad.length) { console.error(`not complete: ${bad.map((r) => r.file).join(', ')}`); return 1; }
    }
    return 0;
  }
  if (cmd === 'check') {
    const { errors, warnings } = checkTables({ terms: flag('--terms') });
    for (const w of warnings) console.log(`warning: ${w}`);
    for (const e of errors) console.log(`error: ${e}`);
    console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
    return errors.length ? 1 : 0;
  }
  if (cmd === 'sync') {
    const { adds, conflicts, tables } = planSync();
    for (const c of conflicts) console.log(`conflict: ${c.file}: ${JSON.stringify(c.zh).slice(0, 60)} → ${JSON.stringify(c.options)}`);
    console.log(`${adds.length} translation(s) to copy, ${conflicts.length} conflict(s)`);
    if (flag('--write')) {
      for (const a of adds) tables.get(a.file)?.strings && (tables.get(a.file).strings[a.zh] = a.en);
      for (const a of adds) if (!tables.has(a.file)) { tables.set(a.file, readTable(a.file)); tables.get(a.file).strings[a.zh] = a.en; }
      for (const f of new Set(adds.map((a) => a.file))) writeTable(f, tables.get(f));
    }
    return conflicts.length ? 1 : 0;
  }
  if (cmd === 'harvest') {
    const rows = await harvest({ write: flag('--write'), refresh: flag('--refresh'), overwrite: flag('--overwrite') });
    for (const r of rows) {
      console.log(`${r.file.padEnd(10)} added ${String(r.added).padStart(5)} (reviewed ${r.reviewed})  kept ${String(r.kept).padStart(4)}  differs-from-official ${r.differ.length}  blocked ${r.stale.length}  ambiguous ${r.ambiguous}  unaligned ${r.mismatched}`);
      for (const s of r.stale) console.log(`    BLOCKED ${JSON.stringify(s.zh).slice(0, 80)}\n        → ${JSON.stringify(s.en).slice(0, 110)}\n        ${s.why}`);
    }
    if (!flag('--write')) console.log('(dry run: --write to update public/locales/en)');
    return 0;
  }
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 20).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  return cmd ? 2 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.error(e.message); process.exitCode = 1; });
}
