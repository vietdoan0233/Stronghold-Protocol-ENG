// Visual tour of the English UI: real server + headless Chromium, screenshots into <work>/tour/ (.cache/locale-work, gitignored).
// usage: node tools/locale-work/tour.mjs [solo|coop]      (needs puppeteer-core and Chromium: CHROME_PATH, see test/e2e/client.mjs)
import puppeteer from 'puppeteer-core';
process.env.CHROME_PATH ||= '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { startRealServer, Client, sleep } = await import('../../test/e2e/client.mjs');
import { mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, WORK } from './paths.mjs';
const mode = process.argv[2] || 'solo';
const OUT = path.join(WORK, 'tour') + path.sep;
mkdirSync(OUT, { recursive: true });
const srv = await startRealServer();
const c = new Client(puppeteer, srv.base, 'tour', { w: 1280, h: 720, prefix: 'tour' });
const shots = [];
async function shot(name) { const f = await c.shot(name); const src = path.join(ROOT, 'test', 'e2e', 'out', f); copyFileSync(src, `${OUT}${name}.png`); shots.push(name); }
try {
  await c.open('');
  await sleep(1500);
  await shot('01-title');
  await c.enter('Tester');
  await sleep(800);
  await shot('02-lobby');
  if (mode === 'coop') {
    await c.click('.mode-card', 'Alliance Simulation');
    await sleep(300);
    await c.click('button', 'Create Alliance');
    await c.page.waitForSelector('.room-screen, .room', { timeout: 15000 }).catch(() => {});
    await sleep(800);
    await shot('03-room');
    for (let i = 0; i < 3; i++) { await c.click('button', 'Add AI Teammate', { optional: true }); await sleep(250); }
    await sleep(600);
    await shot('04-room-full');
    await c.click('button', 'Ready', { optional: true }); await sleep(500);
    await c.click('button', 'Start Simulation', { optional: true });
  } else {
    await c.click('.mode-card', 'Solo Simulation');
    await sleep(300);
    await c.click('button', 'Start Solo Simulation');
    await sleep(1500);
    await c.click('.room-bar__right button', 'Start Simulation', { optional: true, timeout: 8000 });
  }
  // drive the match: log the phases, take a screenshot of each new screen
  let last = '', n = 0;
  for (let i = 0; i < 400 && n < 14; i++) {
    const st = await c.st().catch(() => null);
    if (!st) { await sleep(300); continue; }
    const key = `${st.phase}:${st.round}:${st.sp ? 'sp' : ''}`;
    if (key !== last) {
      last = key; n++;
      await sleep(900);
      await shot(`10-${String(n).padStart(2, '0')}-${st.phase}-r${st.round}`);
      console.log('phase', key);
    }
    // act
    if (st.phase === 'INFO_CHECK') { await c.click('button', 'Ready', { optional: true, timeout: 500 }); }
    if (st.phase === 'BAND_DRAFT') {
      await c.click('.dband', null, { optional: true, timeout: 500 });
      await sleep(300);
      await shot('20-draft-selected').catch(() => {});
      await c.click('button', 'Confirm Selection', { optional: true, timeout: 500 });
    }
    if (st.phase === 'PREP' && st.round >= 1 && n >= 5) break;
    await sleep(500);
  }
  // prep screen: open a shop card, the detail card, the enemy intel, settings, guide
  await sleep(1200);
  await shot('30-prep');
  await c.click('.scard', null, { optional: true, timeout: 800 }); await sleep(700); await shot('31-prep-card-selected');
  await c.click('.scard', null, { optional: true, timeout: 800, button: 'right' }); await sleep(700); await shot('32-prep-detail');
  await c.page.keyboard.press('Escape'); await sleep(300);
  await c.click('button[aria-label="Settings"], .gm__gear', null, { optional: true, timeout: 800 }); await sleep(600); await shot('33-settings');
  await c.page.keyboard.press('Escape'); await sleep(300);
  console.log('problems:', c.problems.filter((p) => !/fonts\.g|\.mp3|\/assets\/|ERR_ABORTED/.test(p)).slice(0, 12));
} catch (e) { console.log('TOUR ERROR', e.message); try { await shot('99-error'); } catch {} }
finally { await c.close(); await srv.stop(); console.log('shots:', shots.join(', ')); }
