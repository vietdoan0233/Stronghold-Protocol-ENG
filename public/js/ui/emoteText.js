// The texts of the emote UI in the shown language. The emote catalog (shared/constants.js EMOTE_THEMES) carries the original
// Chinese labels; the emotes table of the data store (data/emotes.json with the English overlay applied) has them in the
// shown language once it has loaded. Labels are accessible names only (emotes.js never renders one as text).

import { data } from '../data.js';

const cache = new WeakMap();

/** id → label and themeId → name of the loaded emotes table, or null until it has loaded. */
function textsOf() {
  const d = data.get('emotes');
  if (!d || typeof d !== 'object') return null;
  let t = cache.get(d);
  if (!t) {
    t = {
      byId: new Map((Array.isArray(d.emotes) ? d.emotes : []).map((e) => [e.id, e.label])),
      byTheme: new Map((Array.isArray(d.themes) ? d.themes : []).map((th) => [th.themeId, th.name])),
    };
    cache.set(d, t);
  }
  return t;
}

/** An emote's accessible label; the catalog's own text until the emotes table has loaded. @param {{ id: string, label: string }} e */
export const emoteLabel = (e) => textsOf()?.byId.get(e.id) || e.label;

/** A theme's name, likewise. @param {{ themeId: string, name: string }} t */
export const themeName = (t) => textsOf()?.byTheme.get(t.themeId) || t.name;
