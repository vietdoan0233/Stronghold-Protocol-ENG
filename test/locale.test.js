// test/locale.test.js — the English overlay (public/js/locale.js, its hook in public/js/data.js, the tables under
// public/locales/en/): the mechanism (a table keyed by the exact Chinese text, applied at read time, original text as the
// fallback), the data store's handling of a table (parallel fetch, never half-applied, never fatal) and the shipped tables.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyLocale, collectSources, parseLocaleTable, localeUrl, hasLocaleTable, pickLocale, TEXT_KEYS, LOCALE_FILES, LOCALES, DEFAULT_LOCALE } from '../public/js/locale.js';
import { createDataStore, RETRY_DELAYS_MS } from '../public/js/data.js';
import { richTextPlain } from '../public/js/ui/richText.js';
import { checkEntry, checkTables, coverage, planSync, readTable, serializeTable, sourcesOf } from '../tools/locale.mjs';
import { chessSubtitle } from '../public/js/ui/loadoutModel.js';
import { DIFFICULTIES, DIFFICULTY_NAMES } from '../shared/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const table = (strings) => parseLocaleTable({ locale: 'en', strings });
const clone = (o) => JSON.parse(JSON.stringify(o));

describe('difficulty display names', () => {
  test('keeps protocol ids stable while presenting the requested English labels', () => {
    assert.deepEqual(DIFFICULTIES, ['FUNNY', 'NORMAL', 'HARD', 'ABYSS']);
    assert.deepEqual(DIFFICULTY_NAMES, {
      FUNNY: 'Standard Simulation',
      NORMAL: 'Perilous Simulation',
      HARD: 'Dire Simulation',
      ABYSS: 'Ultimate Simulation',
    });
    const config = readJson('public/locales/en/config.json').strings;
    assert.equal(config['险境模拟'], 'Perilous Simulation');
    assert.equal(config['绝境模拟'], 'Dire Simulation');
    assert.equal(config['通关【险境模拟】后解锁'], 'Unlocked after clearing [Perilous Simulation]');
    assert.equal(config['通关2次【绝境模拟】后解锁'], 'Unlocked after clearing [Dire Simulation] 2 times');
    const bands = readJson('public/locales/en/bands.json').strings;
    assert.ok(Object.entries(bands).filter(([key]) => key.includes('险境模拟')).every(([, value]) => value.includes('[Perilous Simulation]')));
  });
});

describe('fixed alliance-effect wording', () => {
  test('uses stacks in the visible result and bond panels', () => {
    const result = readFileSync(path.join(ROOT, 'public/js/screens/result.js'), 'utf8');
    const detail = readFileSync(path.join(ROOT, 'public/js/ui/detailPanel.js'), 'utf8');
    const bonds = readFileSync(path.join(ROOT, 'public/js/ui/bondStrip.js'), 'utf8');
    const matchChrome = readFileSync(path.join(ROOT, 'public/js/ui/matchChrome.js'), 'utf8');
    assert.match(result, /activatedLayers', 'Alliance Stacks'/);
    assert.doesNotMatch(result, /Alliance Layers/);
    assert.match(detail, /alliance stacks/i);
    assert.doesNotMatch(detail, /alliance layers/i);
    assert.match(bonds, /Stacks <b/);
    assert.match(bonds, /'stack' : 'stacks'/);
    assert.match(matchChrome, /title="Leave Spectating"/);
    assert.doesNotMatch(matchChrome, /离开观战/);
  });
});

describe('parseLocaleTable', () => {
  test('accepts a table of its language and nothing else', () => {
    const t = parseLocaleTable({ locale: 'en', strings: { 炎: 'Yan', 坏: 5, 空: '' } });
    assert.ok(t instanceof Map);
    assert.deepEqual([...t], [['炎', 'Yan']], 'non-string and empty translations are dropped');
    assert.equal(parseLocaleTable({ locale: 'fr', strings: { 炎: 'Yan' } }), null, 'another language');
    assert.equal(parseLocaleTable({ strings: { 炎: 'Yan' } }), null, 'no locale marker');
    assert.equal(parseLocaleTable({ locale: 'en' }), null, 'no strings');
    assert.equal(parseLocaleTable({ locale: 'en', strings: [] }), null);
    assert.equal(parseLocaleTable(null), null);
    assert.equal(parseLocaleTable([{ chessId: 'x', name: '炎' }]), null, 'a data file served in place of a table is ignored');
    assert.equal(parseLocaleTable({ bond1: { name: '炎' } }), null);
  });
  test('the language of the URL and the default', () => {
    assert.equal(localeUrl('en', 'bonds'), '/locales/en/bonds.json');
    assert.equal(localeUrl('en', 'bonds', '/x/'), '/x/en/bonds.json');
    assert.equal(DEFAULT_LOCALE, 'en');
    assert.deepEqual([...LOCALES], ['en']);
    assert.equal(pickLocale(''), 'en');
    assert.equal(pickLocale('?room=ABCD'), 'en');
    assert.equal(pickLocale('?lang=zh'), null, 'debugging aid: the original Chinese data');
    assert.equal(pickLocale('?lang=off'), null);
    assert.equal(pickLocale('?lang=en'), 'en');
    assert.equal(pickLocale('?lang=xx'), 'en');
  });
  test('only files with display text have a table', () => {
    for (const f of ['chess', 'bonds', 'bands', 'items', 'enemies', 'bosses', 'tokens', 'stages', 'choices', 'config', 'garrisons', 'effects', 'factions', 'emotes']) assert.ok(hasLocaleTable(f), f);
    for (const f of ['waves', 'assets', 'local', 'tuning', '../x']) assert.ok(!hasLocaleTable(f), f);
  });
});

describe('applyLocale', () => {
  test('replaces whole display values by exact match, at any depth, in objects and arrays', () => {
    const json = {
      bond1: { bondId: 'yanShip', name: '炎', effectName: '炎', members: ['x'], tiers: [{ need: 3, name: '炎' }] },
      list: [{ name: '炎' }, { name: '炎 and more' }, { name: 'ASCII' }],
    };
    const out = applyLocale(json, table({ 炎: 'Yan' }));
    assert.equal(out, json, 'in place');
    assert.equal(json.bond1.name, 'Yan');
    assert.equal(json.bond1.effectName, 'Yan');
    assert.equal(json.bond1.tiers[0].name, 'Yan');
    assert.equal(json.list[0].name, 'Yan');
    assert.equal(json.list[1].name, '炎 and more', 'never a substring');
    assert.equal(json.list[2].name, 'ASCII');
    assert.equal(json.bond1.bondId, 'yanShip', 'ids are never touched');
  });

  test('only the display fields (TEXT_KEYS) are looked at', () => {
    const json = { rec: { name: '炎', profession: '炎', bondId: '炎', _why: '炎', implFormula: '炎', spec: { howToPlay: '炎' } } };
    applyLocale(json, table({ 炎: 'Yan' }));
    assert.equal(json.rec.name, 'Yan');
    for (const k of ['profession', 'bondId', '_why', 'implFormula']) assert.equal(json.rec[k], '炎', `${k} is not display text`);
    assert.equal(json.rec.spec.howToPlay, '炎');
    for (const k of ['name', 'desc', 'descRaw', 'effectName', 'abilities', 'effectDescList', 'flavor', 'note', 'shopExcludedBy', 'subProfessionName', 'eventTypeDesc', 'tip', 'title', 'label', 'seasonName', 'unlockDesc', 'unlockText']) {
      assert.ok(TEXT_KEYS.includes(k), `${k} is display text`);
    }
  });

  test('arrays of strings under a display key are translated element by element; other arrays are not', () => {
    const json = { boss: { abilities: ['飞行', '不动'], tags: ['飞行'] }, mode: { effectDescList: ['·快', '·慢'] } };
    applyLocale(json, table({ 飞行: 'Flying', '·快': '· Fast' }));
    assert.deepEqual(json.boss.abilities, ['Flying', '不动'], 'unknown elements stay');
    assert.deepEqual(json.boss.tags, ['飞行'], 'not a display key');
    assert.deepEqual(json.mode.effectDescList, ['· Fast', '·慢']);
  });

  test('a translated descRaw also derives the plain desc (as the data build does); markup survives', () => {
    const zhRaw = '【炎】干员<@ba.vup>攻击力</>提升\n<在场<@autochess.dgreen>6</>名>召唤';
    const rec = { descRaw: zhRaw, desc: richTextPlain(zhRaw), name: '炎' };
    const enRaw = '<@ba.vup>ATK</> of [Yan] operators increases\n<With <@autochess.dgreen>6</> present> summon';
    applyLocale({ rec }, table({ [zhRaw]: enRaw }));
    assert.equal(rec.descRaw, enRaw);
    assert.equal(rec.desc, richTextPlain(enRaw));
    assert.doesNotMatch(rec.desc, /<@|<\/>/, 'the plain text carries no markup');
    assert.equal(rec.name, '炎', 'no entry, no change');
  });

  test('the derivation applies only where the data has the relation (desc is descRaw without markup); `\\r\\n` aside', () => {
    const zhRaw = '攻击<@ba.vup>+15%</>';
    const own = { descRaw: zhRaw, desc: '一段不同的话' }; // a plain text that is not the stripped raw: left to its own lookup
    applyLocale({ own }, table({ [zhRaw]: 'ATK <@ba.vup>+15%</>' }));
    assert.equal(own.descRaw, 'ATK <@ba.vup>+15%</>');
    assert.equal(own.desc, '一段不同的话');
    const crlf = { descRaw: '被击倒时\r\n丢毒雾', desc: '被击倒时\r\n丢毒雾' };
    applyLocale({ crlf }, table({ '被击倒时\r\n丢毒雾': 'On defeat,\nthrows toxic fog' }));
    assert.equal(crlf.desc, 'On defeat,\nthrows toxic fog');
    const asc = { descRaw: '被击倒时\n丢毒雾', desc: '被击倒时\r\n丢毒雾' }; // the build's own \r\n difference (4 enemies)
    applyLocale({ asc }, table({ '被击倒时\n丢毒雾': 'On defeat,\nthrows toxic fog' }));
    assert.equal(asc.desc, 'On defeat,\nthrows toxic fog');
  });

  test('desc alone (no raw sibling) is looked up like any display field; a plain desc that follows its raw never gets its own entry', () => {
    const a = { desc: '只有一句' };
    const b = { descRaw: '有<@ba.kw>标记</>', desc: '有标记' };
    applyLocale({ a, b }, table({ 只有一句: 'Only one line', 有标记: 'plain only' }));
    assert.equal(a.desc, 'Only one line');
    assert.equal(b.descRaw, '有<@ba.kw>标记</>', 'raw untranslated');
    assert.equal(b.desc, '有标记', 'its plain text follows the raw one: no half-translated record');
    const c = { descRaw: '有<@ba.kw>标记</>', desc: '有标记' };
    applyLocale({ c }, table({ '有<@ba.kw>标记</>': 'with <@ba.kw>markup</>' }));
    assert.deepEqual(c, { descRaw: 'with <@ba.kw>markup</>', desc: 'with markup' });
  });

  test('collectSources: the display texts a table must translate, with the fields they occur under; derived plain texts are not among them', () => {
    const json = {
      a: { name: '炎', desc: '见此', descRaw: '见<@ba.vup>此</>', bondId: '炎', abilities: ['飞行', 'ascii'], tiers: [{ name: '炎', desc: '独立' }] },
      b: { desc: '只有一句', descRaw: '另一句', profession: '近卫' },
    };
    const src = collectSources(json);
    assert.deepEqual([...src.keys()].sort(), ['只有一句', '另一句', '炎', '独立', '见<@ba.vup>此</>', '飞行'].sort());
    assert.deepEqual([...src.get('炎')].sort(), ['name']);
    assert.deepEqual([...src.get('见<@ba.vup>此</>')], ['descRaw'], 'desc follows descRaw');
    assert.deepEqual([...src.get('飞行')], ['abilities']);
    assert.ok(src.has('只有一句') && src.has('另一句'), 'a desc that is not the stripped raw is its own entry');
    assert.equal(collectSources(null).size, 0);
  });

  test('fallback: no table, an empty table, no match — nothing changes; idempotent; prototype-looking text is safe', () => {
    const json = { a: { name: '炎', desc: 'constructor', abilities: ['__proto__', 'toString'] } };
    const before = clone(json);
    assert.equal(applyLocale(json, null), json);
    assert.equal(applyLocale(json, new Map()), json);
    applyLocale(json, table({ 无关: 'x' }));
    assert.deepEqual(json, before);
    applyLocale(json, table({ 炎: 'Yan' }));
    applyLocale(json, table({ 炎: 'Yan' }));
    assert.equal(json.a.name, 'Yan');
    assert.equal(json.a.desc, 'constructor');
    assert.deepEqual(json.a.abilities, ['__proto__', 'toString']);
    assert.equal(applyLocale(null, table({ 炎: 'Yan' })), null);
    assert.equal(applyLocale('str', table({ 炎: 'Yan' })), 'str');
  });

  test('a real data file: a table of its own names changes display text only', () => {
    const bonds = readJson('data/bonds.json');
    const pristine = clone(bonds);
    const names = Object.fromEntries(Object.values(bonds).map((b) => [b.name, `EN ${b.bondId}`]));
    applyLocale(bonds, table(names));
    for (const [id, b] of Object.entries(bonds)) {
      assert.equal(b.name, `EN ${id}`);
      assert.equal(b.bondId, pristine[id].bondId);
      assert.deepEqual(b.spec, pristine[id].spec, 'documentation fields are not display text');
      assert.deepEqual(b.tiers ?? null, pristine[id].tiers ?? null);
    }
  });
});

/** A fake fetch serving { url: json | Error | status }, recording the calls. */
function fakeFetch(files) {
  const fn = async (url) => {
    fn.calls.push(url);
    const v = files[url];
    if (v instanceof Error) throw v;
    if (typeof v === 'number') return { ok: false, status: v, json: async () => ({}) };
    if (v === undefined) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => (typeof v === 'string' ? JSON.parse(v) : clone(v)) };
  };
  fn.calls = [];
  return fn;
}
const DATA = () => ({ bonds: { yan: { bondId: 'yan', name: '炎', desc: '炎 bond', descRaw: '<@ba.vup>炎</> bond' }, sar: { bondId: 'sar', name: '萨尔贡' } } });
const TABLE = { locale: 'en', strings: { 炎: 'Yan', 萨尔贡: 'Sargon', '<@ba.vup>炎</> bond': '<@ba.vup>Yan</> bond' } };

describe('data store with a table', () => {
  test('fetches the table with the file, applies it before the file is ready; lookups, lists and raw reads all see English', async () => {
    const fetch = fakeFetch({ '/data/bonds.json': DATA().bonds, '/locales/en/bonds.json': TABLE });
    const d = createDataStore({ fetch, locale: 'en' });
    const seen = [];
    d.subscribe((n) => seen.push(`${n}:${d.status(n)}:${d.get(n)?.yan?.name}`));
    const p = d.load('bonds');
    assert.equal(d.status('bonds'), 'loading');
    await p;
    assert.deepEqual(fetch.calls.sort(), ['/data/bonds.json', '/locales/en/bonds.json']);
    assert.equal(d.status('bonds'), 'ready');
    assert.equal(d.lookup('bonds', 'yan').name, 'Yan');
    assert.equal(d.lookup('bonds', 'yan').desc, 'Yan bond', 'desc derived from the translated descRaw');
    assert.equal(d.lookup('bonds', 'yan').descRaw, '<@ba.vup>Yan</> bond');
    assert.equal(d.list('bonds').map((b) => b.name).join(), 'Yan,Sargon');
    assert.equal(d.get('bonds').sar.name, 'Sargon');
    assert.deepEqual(seen, ['bonds:ready:Yan'], 'one notification, after the table was applied: never a half-translated record');
  });

  test('no locale (the default of createDataStore) — the table is not even requested; the data is the original Chinese', async () => {
    const fetch = fakeFetch({ '/data/bonds.json': DATA().bonds, '/locales/en/bonds.json': TABLE });
    const d = createDataStore({ fetch });
    await d.load('bonds');
    assert.deepEqual(fetch.calls, ['/data/bonds.json']);
    assert.equal(d.lookup('bonds', 'yan').name, '炎');
  });

  test('a file without display text gets no request for a table', async () => {
    const fetch = fakeFetch({ '/data/waves.json': { w: { n: 1 } }, '/data/assets.json': { a: 1 } });
    const d = createDataStore({ fetch, locale: 'en' });
    await d.loadAll('waves', 'assets');
    assert.deepEqual(fetch.calls.sort(), ['/data/assets.json', '/data/waves.json']);
  });

  test('a missing table (404): the original Chinese, silently', async () => {
    const fetch = fakeFetch({ '/data/bonds.json': DATA().bonds });
    const d = createDataStore({ fetch, locale: 'en' });
    const warn = console.warn;
    const warns = [];
    console.warn = (m) => warns.push(m);
    try { await d.load('bonds'); } finally { console.warn = warn; }
    assert.equal(d.status('bonds'), 'ready');
    assert.equal(d.lookup('bonds', 'yan').name, '炎');
    assert.deepEqual(warns, [], 'a 404 is the normal "not translated yet" state');
  });

  test('a table that is not valid JSON, not a table, or of another language: the original Chinese (warned once when it failed)', async () => {
    const warn = console.warn;
    const warns = [];
    console.warn = (m) => warns.push(String(m));
    try {
      for (const body of ['{"locale": ', { bonds: { yan: { name: 'x' } } }, { locale: 'fr', strings: { 炎: 'Feu' } }, [], 'null']) {
        const fetch = fakeFetch({ '/data/bonds.json': DATA().bonds, '/locales/en/bonds.json': body });
        const d = createDataStore({ fetch, locale: 'en' });
        await d.load('bonds');
        assert.equal(d.status('bonds'), 'ready');
        assert.equal(d.lookup('bonds', 'yan').name, '炎', JSON.stringify(body));
        assert.equal(d.lookup('bonds', 'sar').name, '萨尔贡');
      }
    } finally { console.warn = warn; }
    assert.equal(warns.filter((m) => m.includes('/locales/en/bonds.json')).length, 1, 'only the unparsable body is reported (a failure to load, not a shape)');
  });

  test('a transient failure of the table is retried like the data; giving up leaves the data usable and Chinese', async () => {
    const waits = [];
    const wait = async (ms) => { waits.push(ms); };
    let n = 0;
    const flaky = async (url) => {
      if (url === '/data/bonds.json') return { ok: true, status: 200, json: async () => DATA().bonds };
      n++;
      if (n === 1) throw new TypeError('Failed to fetch');
      if (n === 2) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => clone(TABLE) };
    };
    const d = createDataStore({ fetch: flaky, wait, locale: 'en' });
    await d.load('bonds');
    assert.equal(d.lookup('bonds', 'yan').name, 'Yan');
    assert.deepEqual(waits, RETRY_DELAYS_MS.slice(0, 2));

    const warn = console.warn;
    const warns = [];
    console.warn = (m) => warns.push(String(m));
    try {
      let tries = 0;
      const down = async (url) => {
        if (url === '/data/bonds.json') return { ok: true, status: 200, json: async () => DATA().bonds };
        tries++;
        throw new TypeError('offline');
      };
      const d2 = createDataStore({ fetch: down, wait, locale: 'en' });
      await d2.load('bonds');
      assert.equal(d2.status('bonds'), 'ready', 'a missing table never takes the data down');
      assert.equal(d2.lookup('bonds', 'yan').name, '炎');
      assert.equal(tries, 1 + RETRY_DELAYS_MS.length);
      assert.equal(warns.length, 1);
      assert.match(warns[0], /showing the original text/);
    } finally { console.warn = warn; }
  });

  test('a missing data file stays missing even when its table exists', async () => {
    const warn = console.warn;
    console.warn = () => {};
    try {
      const fetch = fakeFetch({ '/locales/en/bonds.json': TABLE });
      const d = createDataStore({ fetch, locale: 'en' });
      await d.load('bonds');
      assert.equal(d.status('bonds'), 'missing');
      assert.equal(d.get('bonds'), null);
    } finally { console.warn = warn; }
  });

  test('invalidate refetches the file and its table; a superseded load applies nothing and stays silent', async () => {
    const fetch = fakeFetch({ '/data/bonds.json': DATA().bonds, '/locales/en/bonds.json': TABLE });
    const d = createDataStore({ fetch, locale: 'en' });
    await d.load('bonds');
    await d.invalidate('bonds');
    assert.equal(fetch.calls.filter((u) => u === '/locales/en/bonds.json').length, 2);
    assert.equal(d.lookup('bonds', 'yan').name, 'Yan');

    // a load superseded while its table is still on the way
    const releases = [];
    const held = (url) => new Promise((resolve) => {
      const body = url === '/data/bonds.json' ? DATA().bonds : TABLE;
      releases.push(() => resolve({ ok: true, status: 200, json: async () => clone(body) }));
    });
    const e = createDataStore({ fetch: held, locale: 'en' });
    const seen = [];
    e.subscribe((n) => seen.push(`${n}:${e.status(n)}`));
    const first = e.load('bonds');   // data #0, table #1
    const second = e.invalidate('bonds'); // data #2, table #3
    releases.forEach((r) => r());
    await Promise.all([first, second]);
    assert.equal(e.lookup('bonds', 'yan').name, 'Yan');
    assert.deepEqual(seen, ['bonds:loading', 'bonds:ready']);
  });

  test('the same text translates in every record of a file, and records stay distinct objects', async () => {
    const data = { a: { name: '炎' }, b: { name: '炎' }, c: { name: '萨尔贡' } };
    const fetch = fakeFetch({ '/data/items.json': data, '/locales/en/items.json': { locale: 'en', strings: { 炎: 'Yan', 萨尔贡: 'Sargon' } } });
    const d = createDataStore({ fetch, locale: 'en' });
    await d.load('items');
    assert.deepEqual(d.list('items').map((r) => r.name), ['Yan', 'Yan', 'Sargon']);
    assert.notEqual(d.lookup('items', 'a'), d.lookup('items', 'b'));
  });
});

describe('the validator (tools/locale.mjs checkEntry)', () => {
  const E = (zh, en) => checkEntry(zh, en);
  test('identical markup, placeholders, numbers, line breaks and conditions pass', () => {
    assert.deepEqual(E('攻击力<@ba.vup>+15%</>，持续3秒\n<战斗中>每{0:0%}', 'ATK <@ba.vup>+15%</> for 3 seconds\n<In Battle> every {0:0%}'), { blocking: [], human: [], review: [] });
  });
  test('Chinese or full-width characters left, and a blank translation, are never acceptable', () => {
    assert.ok(E('炎', 'Yan 炎').blocking.length);
    assert.ok(E('炎', 'Yan，Sargon').blocking.length, 'a full-width comma');
    assert.deepEqual(E('炎', ' ').blocking, ['blank']);
  });
  test('a lost {n:fmt} placeholder is never acceptable', () => {
    assert.ok(E('提升{0:0%}', 'Increases by 0%').blocking.some((b) => /placeholders/.test(b)));
    assert.ok(E('提升{0:0%}', 'Increases by {0:0%}').blocking.length === 0);
  });
  test('a number of the source that is missing from the English needs a person (stale official English: -15% vs -25%)', () => {
    const r = E('每次治疗量降低15%', 'Healing reduced by 25% per bounce');
    assert.ok(r.human.some((h) => /15/.test(h)), JSON.stringify(r));
    assert.ok(E('阻挡数变为0', 'Cannot block enemies').human.length, 'a number written as a word is only accepted when listed under reviewed');
  });
  test('numbers the English adds (三个 → 3) and tag / condition / line-break differences are review items', () => {
    assert.deepEqual(E('阻挡三个敌人', 'Blocks 3 enemies').review, ['the English has numbers the source writes in words']);
    assert.ok(E('<@ba.vup>攻击</>', 'ATK').review.includes('markup tags differ'));
    assert.ok(E('<替身>作战', 'Fights as a substitute').review.includes('<condition> markers differ'));
    assert.ok(E('一\n二', 'one two').review.includes('line breaks differ'));
    assert.deepEqual(E('3,600,000伤害', '3,600,000 damage'), { blocking: [], human: [], review: [] }, 'thousands separators do not matter');
  });
});

describe('serializeTable', () => {
  test('canonical text: data order first, orphans last, reviewed entries only for translated keys; round-trips', () => {
    const table = { strings: { 乙: 'B', 甲: 'A', 孤: 'orphan', 丙: 'C' }, reviewed: { 乙: 'why', 没有: 'gone' } };
    const text = serializeTable(table, ['甲', '乙', '丙']);
    assert.equal(text, `{
  "locale": "en",
  "strings": {
    "甲": "A",
    "乙": "B",
    "丙": "C",
    "孤": "orphan"
  },
  "reviewed": {
    "乙": "why"
  }
}
`);
    assert.deepEqual(JSON.parse(text).strings, { 甲: 'A', 乙: 'B', 丙: 'C', 孤: 'orphan' });
    assert.ok(!serializeTable({ strings: { 甲: 'A' } }, ['甲']).includes('reviewed'));
  });
});

describe('shipped tables (public/locales/en)', () => {
  const dir = path.join(ROOT, 'public/locales/en');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];

  test('there is a table directory, and every table belongs to a data file with display text', () => {
    assert.ok(files.length > 0, 'public/locales/en/*.json');
    for (const f of files) {
      const name = f.replace(/\.json$/, '');
      assert.ok(LOCALE_FILES.includes(name), `${f}: not a data file with display text (locale.js LOCALE_FILES)`);
      assert.ok(existsSync(path.join(ROOT, 'data', f)), `${f}: no data/${f}`);
    }
  });

  test('every table is in canonical form (node tools/locale.mjs sync --write rewrites it): key order, one entry per line', () => {
    for (const f of files) {
      const name = f.replace(/\.json$/, '');
      const t = readTable(name);
      const order = [...sourcesOf(name).keys()]; // the data's display texts, then the texts the server derives from them
      assert.equal(readFileSync(path.join(dir, f), 'utf8'), serializeTable(t, order), `${f}: not canonical`);
    }
  });

  test('every entry passes the validator: no Chinese left, tags / placeholders / numbers / line breaks / conditions kept (or reviewed), no stale or orphan keys, one translation per text across tables', () => {
    const { errors } = checkTables();
    assert.deepEqual(errors, []);
  });

  test('every table entry is a real translation (not its own source) of Chinese source text', () => {
    for (const f of files) {
      const json = readJson(`public/locales/en/${f}`);
      assert.equal(json.locale, 'en', f);
      for (const [zh, en] of Object.entries(json.strings)) {
        assert.equal(typeof en, 'string', `${f}: ${JSON.stringify(zh)}`);
        assert.notEqual(en, zh, `${f}: ${JSON.stringify(zh)} is its own translation`);
        assert.ok(/[\u4e00-\u9fff\u3040-\u30ff]/.test(zh), `${f}: key ${JSON.stringify(zh)} is not Chinese source text`);
      }
    }
  });

  test('player-facing strings contain no review-note placeholders and call Alliance counts stacks', () => {
    const reviewNote = /\b(?:digits for numbers|official English:\s*the English has|audit note|reviewer note|TODO|TBD)\b/i;
    const allianceCounterSource = /(?:盟约|同盟)[\s\S]{0,24}(?:层数|叠加)|(?:层数|叠加)[\s\S]{0,24}(?:盟约|同盟)|【[^】]+】[\s\S]{0,12}(?:层数|叠加)|(?:层数|叠加)[\s\S]{0,12}【[^】]+】/;
    for (const f of files) {
      const json = readJson(`public/locales/en/${f}`);
      for (const [zh, en] of Object.entries(json.strings)) {
        assert.doesNotMatch(en, reviewNote, `${f}: ${JSON.stringify(zh)} contains a reviewer note`);
        if (allianceCounterSource.test(zh)) {
          assert.doesNotMatch(en, /\blayers?\b/i, `${f}: ${JSON.stringify(zh)} calls an Alliance count a layer`);
        }
      }
    }
  });

  test('the shipped tables, applied to the real data, leave everything but display text untouched', () => {
    for (const f of files) {
      const t = parseLocaleTable(readJson(`public/locales/en/${f}`));
      assert.ok(t && t.size > 0, f);
      const data = readJson(`data/${f}`);
      const out = applyLocale(clone(data), t);
      const strip = (v, key) => {
        if (typeof v === 'string') return TEXT_KEYS.includes(key) ? '·' : v;
        if (Array.isArray(v)) return v.map((x) => strip(x, key));
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, strip(x, k)]));
        return v;
      };
      assert.deepEqual(strip(out, ''), strip(data, ''), `${f}: only display text may differ`);
    }
  });

  test('applied to the real data, every translated text shows its English, and the plain desc follows the markup one', () => {
    for (const f of files) {
      const name = f.replace(/\.json$/, '');
      const t = parseLocaleTable(readJson(`public/locales/en/${f}`));
      const data = applyLocale(readJson(`data/${name}.json`), t);
      const walk = (v) => {
        if (Array.isArray(v)) { v.forEach(walk); return; }
        if (!v || typeof v !== 'object') return;
        if (typeof v.descRaw === 'string' && typeof v.desc === 'string' && !/[\u4e00-\u9fff]/.test(v.descRaw)) {
          assert.equal(v.desc.replace(/\r\n?/g, '\n'), richTextPlain(v.descRaw).replace(/\r\n?/g, '\n'), `${f}: desc must follow descRaw`);
        }
        Object.values(v).forEach(walk);
      };
      walk(data);
    }
  });
});

describe('coverage and sync (tools/locale.mjs)', () => {
  test('coverage counts what the tables still lack; a complete file has nothing missing', () => {
    const rows = coverage(['bonds', 'chess']);
    for (const r of rows) {
      assert.equal(r.done + r.missing.length, r.total);
      assert.equal(r.missingChars, r.missing.reduce((a, m) => a + m.zh.length, 0));
      for (const m of r.missing) assert.ok(/[\u4e00-\u9fff]/.test(m.zh) && m.keys.length > 0);
    }
    assert.deepEqual(coverage(['nope']), []);
  });
  // The ratchet: every data file is translated in full. A data rebuild that adds or rewords Chinese display text fails here
  // until the table has it (node tools/locale.mjs coverage --list).
  test('every data file stays translated in full', () => {
    const rows = coverage(LOCALE_FILES);
    assert.equal(rows.length, LOCALE_FILES.length, 'a locale file without a data file');
    for (const r of rows) assert.deepEqual(r.missing.map((m) => m.zh), [], `${r.file}: display text without English`);
  });
  test('planSync only copies translations that agree across tables', () => {
    const { adds, conflicts } = planSync();
    assert.deepEqual(conflicts, [], 'a text translated two ways in two tables');
    for (const a of adds) assert.ok(a.en && a.zh && a.file);
  });
});

describe('operator names (phase 2)', () => {
  const data = readJson('data/chess.json');
  const table = parseLocaleTable(readJson('public/locales/en/chess.json'));
  const out = applyLocale(clone(data), table);
  const names = new Map(Object.entries(out).map(([id, r]) => [data[id].name, { en: r.name, appellation: data[id].appellation }]));

  test('every one of the 122 operators is shown under an English name (the official Global name)', () => {
    assert.equal(names.size, 122);
    for (const [zh, { en }] of names) assert.ok(en && !/[\u4e00-\u9fff]/.test(en), `${zh} → ${en}`);
  });

  test('the name is the data\'s own English appellation, except where that is not English or not official', () => {
    const EXCEPTIONS = {
      古米: 'Gummy', // appellation "Гум" (stylised); Gummy is the official Global name
      折桠: 'Branch', // appellation "Веточки"; the Chinese server is ahead of Global (charId char_4207_branch)
      '盟约·辅助干员': 'Alliance · Supporter Operator', // appellation "Alliance/Supportive Opertator" (a typo in the data); the class is a Supporter
      甄选干员: 'Selected Operator', // the loadout slot placeholder: no appellation at all
    };
    for (const [zh, { en, appellation }] of names) {
      if (zh in EXCEPTIONS) { assert.equal(en, EXCEPTIONS[zh], zh); continue; }
      assert.equal(en.toLowerCase(), String(appellation).toLowerCase(), `${zh}: ${en} vs appellation ${appellation}`);
    }
  });

  test('chessSubtitle: the small line under the name only shows an appellation that adds something', () => {
    assert.equal(chessSubtitle({ name: 'Insider', appellation: 'Insider' }), '', 'repeats the name');
    assert.equal(chessSubtitle({ name: 'Gummy', appellation: 'Гум' }), '', 'stylised, non-Latin');
    assert.equal(chessSubtitle({ name: '隐现', appellation: 'Insider' }), 'Insider', 'the name is still Chinese (no table): the appellation helps');
    assert.equal(chessSubtitle({ name: 'X' }), '');
    assert.equal(chessSubtitle(null), '');
  });
});
