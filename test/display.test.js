// test/display.test.js — server/display.js: the language of the display texts the server composes for players, and the
// wire contract that follows from it (docs/LOCALE.md "Server texts").

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDisplay, DISPLAY_LANG, L } from '../server/display.js';
import { derivedSources } from '../tools/locale.mjs';
import { bountyText, isMultiRoundBounty } from '../server/match/choices.js';
import { makeCtx } from '../server/match/effectsMeta.js';
import { makeMatch, DATA } from './match/harness.js';

const HAN = /[一-鿿぀-ヿ]/;

/** A throw-away locale directory: { file: { zh: en } } → <dir>/en/<file>.json. */
function tmpLocales(tables) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-display-'));
  fs.mkdirSync(path.join(dir, 'en'));
  for (const [file, strings] of Object.entries(tables)) fs.writeFileSync(path.join(dir, 'en', `${file}.json`), JSON.stringify({ locale: 'en', strings }));
  return dir;
}

test('L: an exact Chinese text becomes its English; anything else comes back unchanged', () => {
  const dir = tmpLocales({ items: { 信标: 'Beacon' } });
  const d = createDisplay({ lang: 'en', dir });
  assert.equal(d.L('信标'), 'Beacon');
  assert.equal(d.L('没有翻译'), '没有翻译');
  assert.equal(d.L(''), '');
  assert.equal(d.L(null), null);
  assert.equal(d.L(undefined), undefined);
  assert.equal(d.L(42), 42);
  fs.rmSync(dir, { recursive: true });
});

test('L: a plain text is found through its markup twin, and \\r\\n does not matter', () => {
  const dir = tmpLocales({ effects: { '【炎】干员<@ba.vup>攻击力</>提升\n第二行': '<@ba.vup>ATK</> of [Yan] operators increases\nSecond line' } });
  const d = createDisplay({ lang: 'en', dir });
  assert.equal(d.L('【炎】干员攻击力提升\n第二行'), 'ATK of [Yan] operators increases\nSecond line');
  assert.equal(d.L('【炎】干员攻击力提升\r\n第二行'), 'ATK of [Yan] operators increases\nSecond line');
  assert.equal(d.L('【炎】干员<@ba.vup>攻击力</>提升\n第二行'), '<@ba.vup>ATK</> of [Yan] operators increases\nSecond line');
  fs.rmSync(dir, { recursive: true });
});

test('L: the first table in LOCALE_FILES order wins; a missing or foreign table is skipped; lang null / unknown translates nothing', () => {
  const dir = tmpLocales({ chess: { 同名: 'Chess name' }, items: { 同名: 'Item name' } });
  fs.writeFileSync(path.join(dir, 'en', 'bonds.json'), '{ not json');
  fs.writeFileSync(path.join(dir, 'en', 'bands.json'), JSON.stringify({ locale: 'fr', strings: { 同名: 'Nom' } }));
  assert.equal(createDisplay({ lang: 'en', dir }).L('同名'), 'Chess name');
  assert.equal(createDisplay({ lang: null, dir }).L('同名'), '同名');
  assert.equal(createDisplay({ lang: 'fr', dir }).L('同名'), '同名');
  assert.equal(createDisplay({ lang: 'en', dir: path.join(dir, 'nowhere') }).L('同名'), '同名');
  fs.rmSync(dir, { recursive: true });
});

test('the shipped tables: operator, family, effect and title names resolve in the server language', () => {
  assert.equal(L('阿米娅'), 'Amiya');
  assert.equal(L('悬赏决策'), 'Bounty Draft');
  assert.equal(L('战术决策'), 'Tactical Decision');
  assert.equal(L('升华'), 'Sublimation');
  assert.equal(L('坚若磐石'), 'Rock Solid');
  assert.equal(L('一个玩家自己取的名字'), '一个玩家自己取的名字', 'what is not in a table is never changed');
});

test('grantChess toast localizes both its speaker and operator name', { skip: DISPLAY_LANG !== 'en' }, () => {
  const h = makeMatch({ mode: 'solo', seed: 73, fake: true }).start();
  h.toPrep(1);
  const skadi = Object.values(DATA.chess).find((c) => c.name === '斯卡蒂' && !c.isGolden);
  assert.ok(skadi, 'Skadi exists in the game data');
  const before = h.sent.filter(([, msg]) => msg.t === 'm.toast').length;
  const source = { kind: 'choice', card: { name: '歌蕾蒂娅' } };
  const got = makeCtx(h.m, h.ps('p_0'), source, 'onRoundStart').grantChess(skadi.chessId, { requirePool: false });
  assert.ok(got);
  const toast = h.sent.filter(([, msg]) => msg.t === 'm.toast')[before]?.[1];
  assert.equal(toast?.text, 'Gladiia: You gained Skadi');
  h.m.dispose();
});

test('multi-round bounty cards: the text the server derives (choices.js bountyText) has an English entry, raw and plain', () => {
  const derived = derivedSources('choices');
  const cards = DATA.choices.cards.bounty.filter(isMultiRoundBounty);
  assert.ok(cards.length >= 8, 'the data has its multi-round cards');
  assert.equal(derived.size, new Set(cards.map((c) => bountyText(DATA.effects[c.effectId].descRaw, c))).size);
  for (const c of cards) {
    const raw = bountyText(DATA.effects[c.effectId].descRaw, c);
    assert.ok(derived.has(raw), `${c.effectId}: derived source`);
    assert.ok(!HAN.test(L(raw)), `${c.effectId}: English for the rewritten text — ${L(raw)}`);
    assert.ok(!HAN.test(L(bountyText(c.desc, c))), `${c.effectId}: English for the rewritten plain text — ${L(bountyText(c.desc, c))}`);
    assert.match(L(raw), /<@ba\.vup>two battles<\/>/, `${c.effectId}: says how long it lasts, in blue`);
  }
});

/** Every string of a message that holds Chinese, with its path. */
function chineseIn(v, p = '', out = []) {
  if (typeof v === 'string') { if (HAN.test(v)) out.push(`${p}: ${v.slice(0, 80)}`); } else if (Array.isArray(v)) v.forEach((x, i) => chineseIn(x, `${p}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) chineseIn(x, p ? `${p}.${k}` : k, out);
  return out;
}

test('wire: no Chinese in the display text the server sends (tickers, toasts, draft cards, effects, titles, result)', () => {
  const seen = [];
  // two co-op matches (humans + a bot) and a solo one, played through to the result; the battle frames (b.snap / b.ev) carry ids only
  for (const [seed, mode] of [[1, 'coop'], [2, 'coop'], [3, 'solo']]) {
    const h = makeMatch({ mode, difficulty: seed % 2 ? 'NORMAL' : 'HARD', humans: mode === 'solo' ? 1 : 2, bots: mode === 'solo' ? 0 : 1, seed, fake: true });
    const check = (msg) => {
      if (!msg || msg.t === 'b.snap' || msg.t === 'b.ev') return;
      seen.push(...chineseIn(msg).map((s) => `${msg.t} ${s}`));
    };
    h.onSend.push((id, msg) => check(msg));
    h.onBroadcast.push((msg) => check(msg));
    h.autoHumans().start();
    h.runToEnd();
  }
  assert.deepEqual([...new Set(seen)].slice(0, 12), [], 'every display field of every message is English');
});
