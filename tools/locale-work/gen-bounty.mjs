// Generate the English of the bounty / tactical-training card sentences ("为自身下场作战添加1只X，将其击倒者获得2资金" …) from
// one template set, so that the ~260 texts (plain choices.cards.desc, markup effects.descRaw, the server-derived multi-round
// variants) read identically. Input: every text the tables still lack (coverage); output: { zh: en } for the ones that match a
// template, ready for merge-batch.mjs. usage: node tools/locale-work/gen-bounty.mjs [out.json]   (default <work>/out/descs-GEN.json)
import fs from 'node:fs';
import { LOCALE_FILES } from '../../public/js/locale.js';
import path from 'node:path';
import { coverage, readTable } from '../locale.mjs';
import { WORK, readWork, EMPTY_OFFICIAL } from './paths.mjs';
const outFile = process.argv[2] || path.join(WORK, 'out', 'descs-GEN.json');

// ---- names: zh → en (tables + official dictionaries + a few manual) -------------------------------------------------------
const names = new Map();
const official = readWork('official-names.json', EMPTY_OFFICIAL);
for (const g of ['operators', 'enemies']) for (const [z, e] of Object.entries(official[g])) names.set(z, e);
for (const f of LOCALE_FILES) { try { for (const [z, e] of Object.entries(readTable(f).strings)) if (z.length <= 24 && !/[，。；]/.test(z) || z.includes('，')) names.set(z, e); } catch { /* */ } }
const MANUAL = { W: 'W', 锏: 'Degenbrecher', '无人机护障·P': 'Blocker–P Drone' };
const nameOf = (zh) => MANUAL[zh] || names.get(zh) || names.get(zh.replace(/^[“"]|[”"]$/g, '')) || null;

// ---- comments of the OpFor cards ------------------------------------------------------------------------------------------
const COMMENT = {
  被击倒时造成持续伤害: 'inflicts damage over time when defeated',
  可造成元素损伤: 'can inflict Elemental Injury',
  拥有隐匿: 'has Invisible',
  空中敌人: 'airborne enemy',
  需要一定攻击次数击破: 'takes a number of hits to break',
  拥有折射: 'has Refraction',
};

const fund = (m) => (Number(m) === 1 ? 'Fund' : 'Funds');

/** The English of one sentence, or null when it is not a bounty-card sentence. */
export function gen(zh) {
  const hlWhen = /<@ba\.vup>(下场作战|下场战斗|两场作战)<\/>/.test(zh);
  const hlAmt = /获得<@ba\.vup>\d+<\/>资金/.test(zh);
  const hlEvery = /<@ba\.vdown>每场<\/>/.test(zh);
  const p = zh.replace(/<\/?[@$][A-Za-z0-9_.\-]+>|<\/>/g, '');
  const amt = (m) => `${hlAmt ? `<@ba.vup>${m}</>` : m} ${fund(m)}`;
  const hl = (s) => (hlWhen ? `<@ba.vup>${s}</>` : s);
  const nm = (zhName, n) => { const en = nameOf(zhName); if (!en) throw new Error(`no English for the enemy ${zhName}`); return `${n} ${en}`; };
  let m;
  // kill bounty, next battle
  if ((m = p.match(/^为自身(?:下场作战|下场战斗)添加(\d+)[只个](.+)，将其击倒者获得(\d+)资金$/))) return `Adds ${nm(m[2], m[1])} to your ${hl('next battle')}; whoever defeats it gains ${amt(m[3])}`;
  // kill bounty, next two battles
  if ((m = p.match(/^为自身接下来两场作战添加(\d+)[只个](.+)，将其击倒者获得(\d+)资金$/))) return `Adds ${nm(m[2], m[1])} to each of your next ${hl('two battles')}; whoever defeats it gains ${amt(m[3])}`;
  // perfect-combat payout (tactical training), next battle
  if ((m = p.match(/^为自身(?:下场作战|下场战斗)添加(\d+)[只个](.+)，若各自行动阶段就达成完美作战，获得(\d+)资金$/))) return `Adds ${nm(m[2], m[1])} to your ${hl('next battle')}; if you achieve a Perfect Combat in your own battle, gain ${amt(m[3])}`;
  // no payout
  if ((m = p.match(/^为自身(?:下场作战|下场战斗)添加(\d+)[只个](.+)，但不获得资金$/))) return `Adds ${nm(m[2], m[1])} to your ${hl('next battle')}, but you gain ${/<@ba\.vup>不获得<\/>/.test(zh) ? '<@ba.vup>no</>' : 'no'} Funds`;
  // multi-round (every battle thereafter)
  const every = hlEvery ? '<@ba.vdown>every</>' : 'every';
  if ((m = p.match(/^之后的每场作战添加(\d+)[只个](.+)，将其击倒者获得(\d+)资金$/))) return `Adds ${nm(m[2], m[1])} to ${every} battle thereafter; whoever defeats it gains ${amt(m[3])}`;
  if ((m = p.match(/^之后的每场作战添加(\d+)[只个](.+)，若各自行动阶段就达成完美作战，获得(\d+)资金$/))) return `Adds ${nm(m[2], m[1])} to ${every} battle thereafter; if you achieve a Perfect Combat in your own battle, gain ${amt(m[3])}`;
  // multi-round OpFor with its comment
  if ((m = p.match(/^后续每场作战添加(\d+)[只个](假想敌：[^（]+)（(.+)）,?，?击倒它的你或队友获得(\d+)资金$/)) || (m = p.match(/^后续每场作战添加(\d+)[只个](假想敌：[^（]+)（(.+)），击倒它的你或队友获得(\d+)资金$/))) {
    const c = COMMENT[m[3]]; if (!c) throw new Error(`no English for the comment ${m[3]}`);
    return `Adds ${nm(m[2], m[1])} (${c}) to ${every} battle thereafter; you or the teammate who defeats it gains ${amt(m[4])}`;
  }
  // the server-derived two-battle variants of the multi-round cards (choices.js bountyText)
  if ((m = p.match(/^接下来两场作战添加(\d+)[只个](.+)，将其击倒者获得(\d+)资金$/))) return `Adds ${nm(m[2], m[1])} to each of the next ${hl('two battles')}; whoever defeats it gains ${amt(m[3])}`;
  if ((m = p.match(/^接下来两场作战添加(\d+)[只个](.+)，若各自行动阶段就达成完美作战，获得(\d+)资金$/))) return `Adds ${nm(m[2], m[1])} to each of the next ${hl('two battles')}; if you achieve a Perfect Combat in your own battle, gain ${amt(m[3])}`;
  if ((m = p.match(/^接下来两场作战添加(\d+)[只个](假想敌：[^（]+)（(.+)），击倒它的你或队友获得(\d+)资金$/))) {
    const c = COMMENT[m[3]]; if (!c) throw new Error(`no English for the comment ${m[3]}`);
    return `Adds ${nm(m[2], m[1])} (${c}) to each of the next ${hl('two battles')}; you or the teammate who defeats it gains ${amt(m[4])}`;
  }
  return null;
}

if (process.argv[1] && process.argv[1].endsWith('gen-bounty.mjs')) {
  const wanted = new Set();
  for (const r of coverage()) for (const m of r.missing) wanted.add(m.zh);
  const out = {}; const unmatched = []; const errors = [];
  for (const zh of wanted) {
    if (!/添加\d*[只个]|添加\d/.test(zh)) continue;
    try { const en = gen(zh); if (en) out[zh] = en; else unmatched.push(zh); } catch (e) { errors.push(`${zh}  →  ${e.message}`); }
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log(`generated ${Object.keys(out).length}; unmatched ${unmatched.length}; errors ${errors.length}`);
  for (const u of unmatched) console.log('UNMATCHED', JSON.stringify(u));
  for (const e of errors) console.log('ERROR', e);
}
