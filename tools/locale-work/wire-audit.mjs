// Wire audit: run bot matches through the real Match engine and list every string in the messages sent to clients that
// contains CJK, grouped by message type + key path. usage: node wire-audit.mjs [seeds=3] [mode=coop]
import { makeMatch } from '../../test/match/harness.js';

const CJK = /[一-鿿぀-ヿ]/;
const seeds = Number(process.argv[2] || 3);
const mode = process.argv[3] || 'coop';
const found = new Map(); // "type path" -> { n, samples:Set }

function scan(type, v, path) {
  if (typeof v === 'string') {
    if (CJK.test(v)) {
      const key = `${type} ${path}`;
      const e = found.get(key) || { n: 0, samples: new Set() };
      e.n++;
      if (e.samples.size < 4) e.samples.add(v.length > 90 ? v.slice(0, 90) + '…' : v);
      found.set(key, e);
    }
  } else if (Array.isArray(v)) {
    for (const x of v) scan(type, x, path + '[]');
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) scan(type, x, path ? `${path}.${k}` : k);
  }
}

for (let seed = 1; seed <= seeds; seed++) {
  const h = makeMatch({ mode, difficulty: seed % 2 ? 'NORMAL' : 'HARD', humans: mode === 'solo' ? 1 : 2, bots: 1, seed, fake: process.env.FAKE !== '0' });
  const onMsg = (msg) => { if (msg && (process.env.FRAMES === '1' || (msg.t !== 'b.snap' && msg.t !== 'b.ev'))) scan(msg.t, msg, ''); };
  h.onSend.push((id, msg) => onMsg(msg));
  h.onBroadcast.push((msg) => onMsg(msg));
  h.autoHumans().start();
  try { h.runToEnd(); } catch (e) { console.error('seed', seed, 'did not end:', e.message.split('\n')[0]); }
}
const rows = [...found.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [k, e] of rows) console.log(`${String(e.n).padStart(5)}  ${k}\n        ${[...e.samples].map((s) => JSON.stringify(s)).join('  |  ')}`);
console.log(`${rows.length} distinct paths carry CJK`);
