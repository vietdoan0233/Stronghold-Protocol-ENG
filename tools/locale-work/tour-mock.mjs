// Screenshots of the mock harness (public/dev/game-mock.html): every phase / variant of the match UI in English, no game
// server needed beyond the static files. usage: node tools/locale-work/tour-mock.mjs [w=1280] [h=720] [filter]
// Screenshots go to <work>/tour-mock-<w>/ (.cache/locale-work, gitignored); every Chinese character still visible is reported.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { WORK } from './paths.mjs';
process.env.CHROME_PATH ||= '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { startRealServer } = await import('../../test/e2e/client.mjs');
const W = Number(process.argv[2] || 1280);
const H = Number(process.argv[3] || 720);
const FILTER = process.argv[4] || '';
const OUT = path.join(WORK, `tour-mock-${W}`) + path.sep;
mkdirSync(OUT, { recursive: true });

const SCENES = [
  ['info', 'phase=INFO_CHECK'],
  ['info-solo', 'phase=INFO_CHECK&variant=solo'],
  ['band-draft', 'phase=BAND_DRAFT'],
  ['prep', 'phase=PREP'],
  ['prep-temp', 'phase=PREP&variant=temp'],
  ['prep-frozen', 'phase=PREP&variant=frozen'],
  ['prep-reward', 'phase=PREP&variant=reward'],
  ['prep-popup', 'phase=PREP&variant=popup'],
  ['prep-detail', 'phase=PREP&variant=detail'],
  ['prep-drawer', 'phase=PREP&variant=drawer'],
  ['prep-info', 'phase=PREP&variant=info'],
  ['prep-pen', 'phase=PREP&variant=pen'],
  ['prep-emote', 'phase=PREP&variant=emote'],
  ['prep-settings', 'phase=PREP&variant=settings'],
  ['prep-bond', 'phase=PREP&variant=bond'],
  ['prep-funny', 'phase=PREP&variant=funny'],
  ['prep-morph', 'phase=PREP&variant=morph'],
  ['prep-harmony', 'phase=PREP&variant=harmony'],
  ['draft-bounty', 'phase=SP_DRAFT&variant=bounty'],
  ['draft-supply', 'phase=SP_DRAFT&variant=supply'],
  ['draft-shop', 'phase=SP_DRAFT&variant=shop'],
  ['draft-tactic', 'phase=SP_DRAFT&variant=tactic'],
  ['battle', 'phase=COMBAT'],
  ['unite', 'phase=UNITE'],
  ['unite-leaker', 'phase=UNITE&variant=leaker'],
  ['settle', 'phase=SETTLE'],
  ['final-assault', 'phase=FINAL_ASSAULT'],
  ['hidden-core', 'phase=HIDDEN_CORE'],
  ['prep-boss', 'phase=PREP&variant=boss'],
  ['dead', 'phase=PREP&variant=dead'],
  ['defeat', 'phase=SETTLE&variant=defeat'],
  ['result', 'phase=RESULT'],
];

const srv = await startRealServer();
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'], defaultViewport: { width: W, height: H } });
const problems = [];
try {
  for (const [name, q] of SCENES) {
    if (FILTER && !name.includes(FILTER)) continue;
    const page = await browser.newPage();
    page.on('pageerror', (e) => problems.push(`${name}: pageerror ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|favicon|\/assets\//.test(m.text())) problems.push(`${name}: console ${m.text().slice(0, 140)}`); });
    // block the external hosts the sandbox cannot reach (fonts), so 'load' never waits on them
    await page.setRequestInterception(true);
    page.on('request', (r) => (/^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(r.url()) ? r.abort() : r.continue()));
    try {
      await page.goto(`${srv.base}/dev/game-mock.html?${q}&shot=1`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise((r) => setTimeout(r, 2500));
      await page.screenshot({ path: `${OUT}${name}.png` });
      // every Chinese character that is still visible text / label on the page
      const cjk = await page.evaluate(() => {
        const out = new Set();
        const re = /[一-鿿぀-ヿ]/;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) { const t = n.textContent.trim(); if (t && re.test(t) && n.parentElement && getComputedStyle(n.parentElement).display !== 'none') out.add(t.slice(0, 80)); }
        for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v && re.test(v)) out.add(`@${a}: ${v.slice(0, 80)}`); }
        return [...out];
      });
      if (cjk.length) problems.push(`${name}: Chinese on screen → ${cjk.slice(0, 6).join(' | ')}${cjk.length > 6 ? ` (+${cjk.length - 6})` : ''}`);
      console.log('shot', name, cjk.length ? `(${cjk.length} Chinese)` : '');
    } catch (e) { problems.push(`${name}: ${e.message}`); console.log('FAILED', name, e.message); }
    await page.close();
  }
} finally {
  await browser.close();
  await srv.stop();
  console.log('--- problems:');
  for (const p of problems) console.log(p);
}
