// The English edition's behavior that is not text: the operator's subtitle line, and the underframe's button box when the
// labels are English (wider than a plate). The Chinese layout is checked against the plate geometry it always had.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { chessSubtitle } from '../../public/js/ui/loadoutModel.js';
import { underframeRect } from '../../public/js/ui/underframe.js';

describe('chessSubtitle: the romanised appellation under an operator\'s name', () => {
  test('an English name shows an appellation that adds something', () => {
    assert.equal(chessSubtitle({ name: 'Gummy', appellation: 'Insider' }), 'Insider');
  });

  test('an appellation that repeats the name is left out', () => {
    assert.equal(chessSubtitle({ name: 'Leizi', appellation: 'Leizi' }), '');
  });

  test('a stylised non-Latin appellation is left out of an English name', () => {
    assert.equal(chessSubtitle({ name: 'Gummy', appellation: 'Гум' }), '');
  });

  test('a Chinese name keeps its appellation, even a non-Latin one', () => {
    assert.equal(chessSubtitle({ name: '古米', appellation: 'Гум' }), 'Гум');
    assert.equal(chessSubtitle({ name: '古米', appellation: 'Gummy' }), 'Gummy');
  });

  test('no record, no appellation: nothing', () => {
    assert.equal(chessSubtitle(null), '');
    assert.equal(chessSubtitle({ name: 'X' }), '');
    assert.equal(chessSubtitle({ name: 'X', appellation: '   ' }), '');
  });
});

describe('underframeRect: the button box', () => {
  const g = { x: 500, y: 600, s: 100 };

  // the geometry before the English edition: the plate (0.56 rem) is the box of both buttons
  function plateRect(g, rem) {
    const s = g.s > 0 ? g.s : 64;
    const half = s * 1.05;
    const P = rem * 0.56;
    const H = P + rem * 0.26;
    const q = half / 2;
    const btnTop = g.y - q - 0.9 * H;
    return {
      left: Math.min(g.x - half, g.x - q - 0.8 * P),
      right: Math.max(g.x + half, g.x + q - 0.2 * P + P + rem * 0.14),
      top: Math.min(g.y - half, btnTop - rem * 0.08),
      bottom: g.y + half,
    };
  }

  test('the default (Chinese) layout is the plate geometry it always was', () => {
    assert.deepEqual(underframeRect(g, 100), plateRect(g, 100));
    assert.deepEqual(underframeRect(g, 100, { wideLabels: false }), plateRect(g, 100));
  });

  test('wide (English) labels widen the box on both sides, never narrow it', () => {
    const narrow = underframeRect(g, 100);
    const wide = underframeRect(g, 100, { wideLabels: true });
    assert.ok(wide.left <= narrow.left, 'the left button reaches further left');
    assert.ok(wide.right >= narrow.right, 'the right button reaches further right');
    assert.equal(wide.top, narrow.top, 'the rows keep their height');
    assert.equal(wide.bottom, narrow.bottom);
  });

  test('no geometry: null', () => {
    assert.equal(underframeRect(null, 100, { wideLabels: true }), null);
  });
});
