// The English edition's tables as a fallback of the game-text build (tools/build-i18n.mjs): a text the official pairs do
// not translate takes the fork's English; a text two tables translate differently is left out (a collision); a reviewed
// override replaces the official English only when it is listed in tools/i18n/fork-overrides.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOverlay, readForkTables } from '../tools/build-i18n.mjs';
import { applyFileOverlay } from '../shared/i18nData.js';

const zh = [{ name: '官方', desc: '官方文本' }];
const en = [{ name: 'Official', desc: 'Official text' }];
const data = { chess: { c1: { name: '官方', desc: '官方文本', extra: '只有叠加层的文本' } } };

test('a text the official pairs leave out takes the fork English, counted under its own source', () => {
  const { overlay, report } = buildOverlay({
    zh, en, data, lang: 'en',
    fallback: { fork: { 只有叠加层的文本: 'Only in the overlay' } },
  });
  const c = applyFileOverlay(data.chess, overlay.files.chess).value.c1;
  assert.equal(c.extra, 'Only in the overlay');
  assert.equal(c.name, 'Official', 'official text is kept');
  assert.equal(report.coverage.operators.fork, 1, 'chess records are the operators kind');
});

test('the fork English does not replace an official translation by default', () => {
  const { overlay } = buildOverlay({
    zh, en, data, lang: 'en',
    fallback: { fork: { 官方: 'Fork wording' } },
  });
  assert.equal(applyFileOverlay(data.chess, overlay.files.chess).value.c1.name, 'Official');
});

test('a reviewed override replaces the official English of the listed text, and only that text', () => {
  const { overlay, report } = buildOverlay({
    zh, en, data, lang: 'en',
    overrides: { 官方文本: 'Reviewed wording' },
  });
  const c = applyFileOverlay(data.chess, overlay.files.chess).value.c1;
  assert.equal(c.desc, 'Reviewed wording');
  assert.equal(c.name, 'Official');
  assert.deepEqual(report.overrides, ['官方文本']);
});

test('readForkTables: one table per file, a text two tables translate differently is a collision and stays Chinese', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'fork-tables-'));
  try {
    const en2 = path.join(dir, 'en');
    mkdirSync(en2);
    writeFileSync(path.join(en2, 'a.json'), JSON.stringify({ locale: 'en', strings: { 同一: 'Same', 冲突: 'One' } }));
    writeFileSync(path.join(en2, 'b.json'), JSON.stringify({ locale: 'en', strings: { 同一: 'Same', 冲突: 'Two', 只在这里: 'Here' } }));
    const { map, collisions } = await readForkTables(en2);
    assert.equal(map['同一'], 'Same', 'the same English in two tables is one entry');
    assert.equal(map['只在这里'], 'Here');
    assert.ok(!('冲突' in map), 'a colliding text is left out, not picked');
    assert.equal(collisions.length, 1);
    assert.equal(collisions[0].zh, '冲突');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readForkTables: a missing directory is an empty set', async () => {
  const { map, collisions } = await readForkTables(path.join(tmpdir(), 'no-such-fork-dir-for-test'));
  assert.deepEqual(map, {});
  assert.deepEqual(collisions, []);
});

test('the shipped fork tables give no collisions', async () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'i18n', 'fork', 'en');
  const { collisions } = await readForkTables(dir);
  assert.deepEqual(collisions, [], 'no Chinese text has two English translations across the fork tables');
  assert.ok(readFileSync(path.join(dir, 'chess.json'), 'utf8').includes('"strings"'));
});
