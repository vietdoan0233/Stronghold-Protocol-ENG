// The optional local-client art manifest (data/local-assets.json, DESIGN §13): an install without it must get an
// empty manifest (200) instead of a 404, and an install with it must get the real file. The docs and the setup /
// doctor messages say what falls back without it (GitHub issue #42, DESIGN §22.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createStaticHandler } from '../server/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function serve(dataDir) {
  const handler = createStaticHandler({ publicDir: path.join(ROOT, 'public'), dataDir, sharedDir: path.join(ROOT, 'shared') });
  const srv = http.createServer((req, res) => {
    const [p, q] = req.url.split('?');
    handler(req, res, p, q || '');
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}

function get(srv, url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: srv.address().port, path: url, method }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('missing data/local-assets.json → 200 empty manifest (no 404 on installs without local art)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-noart-'));
  fs.writeFileSync(path.join(dir, 'config.json'), '{}');
  const srv = await serve(dir);
  try {
    const r = await get(srv, '/data/local-assets.json');
    assert.equal(r.status, 200);
    assert.match(r.type, /application\/json/);
    const doc = JSON.parse(r.body);
    assert.deepEqual(doc.groups, {});
    const h = await get(srv, '/data/local-assets.json', 'HEAD');
    assert.equal(h.status, 200);
    assert.equal(h.body, '');
    // other missing data files still 404
    assert.equal((await get(srv, '/data/nope.json')).status, 404);
    assert.equal((await get(srv, '/data/sub/local-assets.json')).status, 404);
  } finally {
    srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('present data/local-assets.json is served as-is', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-art-'));
  const doc = { version: 1, source: 'local-client', count: 1, groups: { module: { 'mar-x': { path: '/assets/local/module/mar-x.png' } } } };
  fs.writeFileSync(path.join(dir, 'local-assets.json'), JSON.stringify(doc));
  const srv = await serve(dir);
  try {
    const r = await get(srv, '/data/local-assets.json');
    assert.equal(r.status, 200);
    assert.deepEqual(JSON.parse(r.body), doc);
  } finally {
    srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('docs and messages say what falls back without the local art and how a server without the client gets it (GitHub issue #42)', async () => {
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  const { LOCAL_ART_FALLBACK, LOCAL_ART_COPY_HINT } = await import('../tools/setup.mjs');
  const setup = read('tools/setup.mjs');
  const doctor = read('tools/doctor.mjs');
  assert.match(LOCAL_ART_FALLBACK, /^The board uses 2D; some official UI icons and the Hot \/ Blazing Originium Slug models use replacements$/);
  assert.ok(!/emotes|How to Play/i.test(LOCAL_ART_FALLBACK), 'emotes and How to Play pages are downloaded, not local-only');
  assert.match(LOCAL_ART_COPY_HINT, /^If another compatible installation has these assets, copy public\/assets\/local and data\/local-assets\.json together$/);
  // setup's row is printed on every start (scripts/launch.mjs): it names the fallbacks and points to DEPLOY §6; doctor adds the hint
  const noClientRow = setup.split('\n').find((l) => l.includes("'No Arknights client detected'") && l.includes('LOCAL_ART_FALLBACK'));
  assert.ok(noClientRow && noClientRow.includes('LOCAL_ART_FALLBACK') && noClientRow.includes('docs/DEPLOY.md §6') && !noClientRow.includes('LOCAL_ART_COPY_HINT'), noClientRow);
  assert.ok(doctor.includes('Not extracted: ${LOCAL_ART_FALLBACK} (see docs/DEPLOY.md §6). ${LOCAL_ART_COPY_HINT}.'), 'doctor output points to the English fallback and copy hint');
  const deploy = read('docs/DEPLOY.md');
  const s6 = deploy.slice(deploy.indexOf('## 6. Optional local-client art'));
  assert.ok(deploy.includes('## 6. Optional local-client art') && s6.length > 200, 'DEPLOY §6');
  for (const re of [/compatible PC client/i, /official 3D board textures/i, /selected UI icons/i, /enemy models/i,
    /36 battle emotes and 19 How to Play pages from the public mirror/i, /2D renderer/i, /selected art uses replacements/i,
    /public\/assets\/local\//, /data\/local-assets\.json/]) assert.match(s6, re);
  const readme = read('README.md');
  assert.match(readme, /Without a client, the 2D board is used automatically and nothing else is affected\./);
  assert.match(read('docs/PLAYING.md'), /tutorial pages, downloaded during normal setup/i);
});
