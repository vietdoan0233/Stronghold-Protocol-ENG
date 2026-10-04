// server/display.js — the language of the display texts the SERVER composes for players.
//
// The server reads the pristine Chinese data/*.json (the simulation parses rule text; test/data.test.js pins the files),
// so text it composes from that data — a draft card's name, an effects-list entry, a ticker line built from a broadcast
// template — would reach the English client in Chinese. Such text goes through L(): the same English overlay the client
// applies to its own copy of the data (public/locales/<lang>/*.json, docs/LOCALE.md), looked up by the exact Chinese
// text, and Chinese when there is no entry. A plain text is found through its markup twin (the tables are keyed by the
// markup `descRaw`; the plain `desc` is that text stripped). Fixed server messages are written in English in place.
//
// Only text taken from the data is passed through L(): never a player's callsign (a callsign that happens to equal an
// operator's name must stay as typed). SP_LOCALE=zh turns the overlay off (the original Chinese).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, LOCALES, LOCALE_FILES, parseLocaleTable } from '../public/js/locale.js';
import { richTextPlain } from '../public/js/ui/richText.js';

const LOCALE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'locales');
const NL = /\r\n?/g;

/** The language the server speaks: SP_LOCALE (`zh` / `off` = the original Chinese), else the default (English). */
function defaultLang(env = process.env) {
  const v = env.SP_LOCALE;
  if (v === 'zh' || v === 'off') return null;
  return v && LOCALES.includes(v) ? v : DEFAULT_LOCALE;
}

/**
 * @param {{ lang?: string|null, dir?: string }} [o] `lang` null = no translation (Chinese)
 * @returns {{ lang: string|null, L: <T>(text: T) => T, size: () => number }}
 */
export function createDisplay({ lang = defaultLang(), dir = LOCALE_DIR } = {}) {
  /** @type {Map<string, string>|null} */
  let index = null;
  const build = () => {
    const map = new Map();
    const plains = new Map();
    if (lang && LOCALES.includes(lang)) {
      for (const file of LOCALE_FILES) {
        let json;
        try { json = JSON.parse(fs.readFileSync(path.join(dir, lang, `${file}.json`), 'utf8')); } catch { continue; }
        const table = parseLocaleTable(json, lang);
        if (!table) continue;
        for (const [zh, en] of table) {
          if (!map.has(zh)) map.set(zh, en);
          const plain = richTextPlain(zh);
          if (plain !== zh && !plains.has(plain)) plains.set(plain, richTextPlain(en));
        }
      }
      for (const [zh, en] of plains) if (!map.has(zh)) map.set(zh, en);
    }
    return map;
  };
  const L = (text) => {
    if (typeof text !== 'string' || !text) return text;
    const map = index || (index = build());
    const hit = map.get(text);
    if (hit !== undefined) return hit;
    const nl = text.replace(NL, '\n');
    return nl !== text ? (map.get(nl) ?? text) : text;
  };
  return { lang, L, size: () => (index || (index = build())).size };
}

const display = createDisplay();

/**
 * A display text of the data in the server's language (see the module header); anything without an entry — and any
 * non-string — comes back unchanged.
 * @template T @param {T} text @returns {T}
 */
export const L = (text) => display.L(text);
