// English overlay for the generated game data (data/*.json), applied at read time — the data files stay pristine.
//
// data/*.json is built from the official Chinese client data (tools/build-data.mjs) and checked byte-for-byte by
// test/data.test.js, so it is never edited by hand. The English text lives beside it, one table per data file, in
// public/locales/<lang>/<name>.json (served statically as /locales/<lang>/<name>.json):
//
//   { "locale": "en",
//     "strings": { "炎": "Yan",
//                  "【炎】干员<@ba.vup>攻击力</>提升": "<@ba.vup>ATK</> of [Yan] operators increases" } }
//
// A table is keyed by the EXACT Chinese source text of a display field, not by record id: the same text (a skill shared
// by an operator's two stars, a description repeated over 249 garrisons) is translated once, and a translation can never
// go stale silently — when a data rebuild changes the Chinese (a balance number, a rewording) the key stops matching and
// the original Chinese shows until the entry is updated (tools/locale.mjs lists those). Anything without an entry —
// a missing table, a missing key, a table that failed to load — falls through to the original Chinese, so the game is
// playable at every step of the translation.
//
// applyLocale() walks a freshly parsed data file once and replaces the value of every display-text field (TEXT_KEYS)
// that is a key of the table. Identifiers, ids, enums and numbers are never touched: only the keys below are looked at,
// and only whole values are replaced (never a substring). Rich-text markup (`<@ba.vup>…</>`, `{0:0%}` placeholders —
// ui/richText.js) lives inside the translated strings and must survive translation verbatim; tools/locale.mjs checks
// every entry for it. The plain `desc` of a record that also carries a markup `descRaw` is never translated on its own:
// it follows its `descRaw` (richTextPlain of the translation, exactly how the data build derives it), so the two can
// never disagree and a table needs only the markup text.

import { richTextPlain } from './ui/richText.js';

/** Languages with a table under public/locales/. The original data is Chinese. */
export const LOCALES = Object.freeze(['en']);
/** Language shown when nothing else is asked for. */
export const DEFAULT_LOCALE = 'en';

/**
 * Data files that carry display text — the only ones that get a table (the others, such as waves / assets, have none, so
 * no request is wasted on a 404). Keep in step with DATA.md.
 */
export const LOCALE_FILES = Object.freeze([
  'chess', 'bonds', 'items', 'bands', 'enemies', 'bosses', 'stages', 'tokens', 'choices', 'config',
  'garrisons', 'effects', 'factions', 'emotes',
]);

/**
 * The fields (by name, at any depth) whose string value — or, for an array, whose string elements — is display text a
 * table may translate. Documentation-only fields of the data (bonds `spec`, items `implFormula`, choices `assumed` …)
 * are deliberately not listed: no screen shows them.
 */
export const TEXT_KEYS = Object.freeze([
  'name', 'effectName', 'seasonName', 'subProfessionName', 'eventTypeDesc',
  'desc', 'descRaw', 'effectDesc', 'effectDescRaw', 'moduleDesc', 'moduleDescRaw', 'text', 'textRaw',
  'unlockDesc', 'unlockText', 'flavor', 'note', 'shopExcludedBy', 'label', 'tip', 'title',
  'abilities', 'effectDescList',
]);

/** [plain, raw] pairs: the plain field is the raw field's markup stripped (DATA.md §0). */
const PLAIN_RAW = Object.freeze([['desc', 'descRaw'], ['moduleDesc', 'moduleDescRaw'], ['effectDesc', 'effectDescRaw'], ['text', 'textRaw']]);

const TEXT_KEY_SET = new Set(TEXT_KEYS);
const RAW_KEYS = new Set(PLAIN_RAW.map(([, raw]) => raw));

/** URL of a language's table for a data file. @param {string} lang @param {string} name @param {string} [base] */
export const localeUrl = (lang, name, base = '/locales/') => `${base}${lang}/${name}.json`;

/** Does the data file `name` have a table? */
export const hasLocaleTable = (name) => LOCALE_FILES.includes(name);

/**
 * The `strings` of a parsed table as a Map, or null when the JSON is not a table of this language (a missing file served
 * as something else, a corrupt file, another language) — callers then keep the original text.
 * @param {any} json parsed public/locales/<lang>/<name>.json
 * @param {string} lang
 * @returns {Map<string, string>|null}
 */
export function parseLocaleTable(json, lang = DEFAULT_LOCALE) {
  if (!json || typeof json !== 'object' || Array.isArray(json) || json.locale !== lang) return null;
  const strings = json.strings;
  if (!strings || typeof strings !== 'object' || Array.isArray(strings)) return null;
  const map = new Map();
  for (const [zh, en] of Object.entries(strings)) {
    if (typeof en === 'string' && en) map.set(zh, en);
  }
  return map;
}

const NL = /\r\n?/g;
/** The record's plain text is its raw text stripped of markup (`\r\n` aside) — the relation the data build guarantees. */
const followsRaw = (raw, plain) => richTextPlain(raw).replace(NL, '\n') === plain.replace(NL, '\n');

/**
 * Walk one object's display fields. `look(source, key)` returns the English text or undefined.
 * @param {Record<string, any>} node
 * @param {(source: string, key: string) => string|undefined} look
 * @param {{ replaced: number }} stats
 */
function walkObject(node, look, stats) {
  // a plain `desc` that follows its markup `descRaw` is never looked up itself: it is derived from the raw's translation
  const done = new Set();
  for (const [plainKey, rawKey] of PLAIN_RAW) {
    const raw = node[rawKey];
    const plain = node[plainKey];
    if (typeof raw !== 'string' || typeof plain !== 'string' || !followsRaw(raw, plain)) continue;
    done.add(plainKey).add(rawKey);
    const en = look(raw, rawKey);
    if (en === undefined) continue;
    node[rawKey] = en;
    node[plainKey] = richTextPlain(en);
    stats.replaced += 2;
  }
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (typeof v === 'string') {
      if (!TEXT_KEY_SET.has(key) || done.has(key)) continue;
      const en = look(v, key);
      if (en !== undefined) { node[key] = en; stats.replaced++; }
    } else if (Array.isArray(v)) {
      const display = TEXT_KEY_SET.has(key);
      for (let i = 0; i < v.length; i++) {
        const el = v[i];
        if (typeof el === 'string') {
          if (!display) continue;
          const en = look(el, key);
          if (en !== undefined) { v[i] = en; stats.replaced++; }
        } else if (el && typeof el === 'object') {
          walkNode(el, look, stats);
        }
      }
    } else if (v && typeof v === 'object') {
      walkNode(v, look, stats);
    }
  }
}

function walkNode(node, look, stats) {
  if (Array.isArray(node)) {
    for (const el of node) if (el && typeof el === 'object') walkNode(el, look, stats);
  } else {
    walkObject(node, look, stats);
  }
}

/**
 * Apply a translation table to a parsed data file, in place (the caller owns the freshly parsed JSON).
 * @param {any} json parsed data/<name>.json
 * @param {Map<string, string>|null} table from parseLocaleTable (null/empty → nothing changes)
 * @returns {any} the same `json`
 */
export function applyLocale(json, table) {
  if (!table || !table.size || !json || typeof json !== 'object') return json;
  walkNode(json, (source) => table.get(source), { replaced: 0 });
  return json;
}

const HAN = /[\u4e00-\u9fff\u3040-\u30ff]/;

/**
 * The source texts a table has to translate for a data file: every display value (TEXT_KEYS) that holds Chinese and is
 * looked up by applyLocale — a plain `desc` that follows its `descRaw` is not one (it is derived). For coverage tooling.
 * @param {any} json parsed data/<name>.json
 * @returns {Map<string, Set<string>>} source text → the field names it occurs under
 */
export function collectSources(json) {
  const out = new Map();
  const look = (source, key) => {
    if (!HAN.test(source)) return undefined;
    let keys = out.get(source);
    if (!keys) out.set(source, (keys = new Set()));
    keys.add(key);
    return undefined;
  };
  if (json && typeof json === 'object') walkNode(json, look, { replaced: 0 });
  return out;
}

/** The language to show: `?lang=zh` (debugging aid: the original Chinese data) turns the overlay off. @returns {string|null} */
export function pickLocale(search = typeof location !== 'undefined' ? location.search : '') {
  try {
    const v = new URLSearchParams(search).get('lang');
    if (v === 'zh' || v === 'off') return null;
    if (v && LOCALES.includes(v)) return v;
  } catch { /* no URL support: the default */ }
  return DEFAULT_LOCALE;
}
