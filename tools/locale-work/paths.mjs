// Shared locations of the locale work tools (see README.md in this directory).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Scratch directory for the reference dictionaries (official-names.json, doc-name-pairs.json), batches and outputs.
 *  Git-ignored (.cache/); override with LOCALE_WORK=/some/dir. */
export const WORK = process.env.LOCALE_WORK || path.join(ROOT, '.cache', 'locale-work');
export const EMPTY_OFFICIAL = { operators: {}, enemies: {}, skills: {}, modules: {}, terms: {} };

/** Read a reference file of WORK; when it does not exist yet, say how to build it and carry on with `fallback`. */
export function readWork(name, fallback) {
  const p = path.join(WORK, name);
  if (!existsSync(p)) {
    const how = name === 'official-names.json' ? 'node tools/locale-work/official-names.mjs' : 'node tools/locale-work/doc-names.mjs';
    console.warn(`(no ${path.relative(ROOT, p)} — build the reference dictionary with: ${how})`);
    return fallback;
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}
