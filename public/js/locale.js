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
// ui/richText.js) lives inside the translated strings and must survive translation verbatim; test/locale.test.js checks
// every entry for it. The plain `desc` of a record that also carries a markup `descRaw` is derived from the translated
// `descRaw` (richTextPlain), exactly as the data build derives it, so the two can never disagree.

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
const RAW_OF = new Map(PLAIN_RAW);

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

/** The text a node's own `desc`-like field shows once its raw sibling is translated (newline normalised like the parser). */
const plainOfSource = (raw) => richTextPlain(raw);

/** The same without markup: the raw source's plain text equals the record's plain field, `\r\n` aside. */
const sameText = (a, b) => a === b || a.replace(/\r\n?/g, '\n') === b.replace(/\r\n?/g, '\n');

/**
 * Translate the display-text fields of one object in place.
 * @param {Record<string, any>} node
 * @param {Map<string, string>} table
 * @param {{ replaced: number }} stats
 */
function localizeObject(node, table, stats) {
  const keys = Object.keys(node);
  // markup fields first: a translated `descRaw` also fixes its plain `desc` (derived, never looked up separately)
  const derived = new Set();
  for (const key of keys) {
    if (!RAW_KEYS.has(key)) continue;
    const raw = node[key];
    if (typeof raw !== 'string') continue;
    const en = table.get(raw);
    if (en === undefined) continue;
    node[key] = en;
    stats.replaced++;
    const plainKey = PLAIN_RAW.find(([, r]) => r === key)[0];
    const plain = node[plainKey];
    if (typeof plain === 'string' && sameText(plainOfSource(raw), plain)) {
      node[plainKey] = richTextPlain(en);
      derived.add(plainKey);
      stats.replaced++;
    }
  }
  for (const key of keys) {
    const v = node[key];
    if (v === null || typeof v !== 'object' && typeof v !== 'string') continue;
    if (typeof v === 'string') {
      if (!TEXT_KEY_SET.has(key) || RAW_KEYS.has(key) || derived.has(key)) continue;
      const en = table.get(v);
      if (en !== undefined) { node[key] = en; stats.replaced++; }
    } else if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const el = v[i];
        if (typeof el === 'string') {
          if (!TEXT_KEY_SET.has(key)) continue;
          const en = table.get(el);
          if (en !== undefined) { v[i] = en; stats.replaced++; }
        } else if (el && typeof el === 'object') {
          localizeNode(el, table, stats);
        }
      }
    } else {
      localizeNode(v, table, stats);
    }
  }
}

function localizeNode(node, table, stats) {
  if (Array.isArray(node)) {
    for (const el of node) if (el && typeof el === 'object') localizeNode(el, table, stats);
  } else {
    localizeObject(node, table, stats);
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
  localizeNode(json, table, { replaced: 0 });
  return json;
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
