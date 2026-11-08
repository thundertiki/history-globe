// Headless check of the top bar, menu and overlay toggles against a running dev server (npm run dev -- --port 5174).
import { chromium } from 'playwright-core';
const URL = process.env.HG_URL || 'http://localhost:5174/';
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let fail = 0;
const check = (ok, msg) => { if (!ok) fail++; console.log(ok ? 'PASS' : 'FAIL', msg); };
const isOff = (f) => JSON.stringify(f) === JSON.stringify(['boolean', false]);

async function open(width, setup) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  page.on('pageerror', (e) => errors.push(e.message));
  if (setup) await page.addInitScript(setup);
  await page.goto(URL);
  await page.waitForFunction(() => window.hg?.globe.map.loaded(), null, { timeout: 30000 });
  return page;
}

// ---- Top bar, menu, Events toggle (390 px, with an old stored setting that turned early humans off) ----
{
  const page = await open(390, () => localStorage.setItem('hg-layers', JSON.stringify({ events: true, human: false })));
  check(await page.evaluate(() => !document.getElementById('layers-btn') && !document.getElementById('layers')), 'Layers menu is gone');
  check(await page.evaluate(() => !!document.getElementById('search-btn') && !!document.getElementById('more-btn')), 'top bar has search and more buttons');
  check(await page.evaluate(() => document.getElementById('more-menu').hidden), 'menu starts closed');
  await page.click('#more-btn');
  const menu = await page.evaluate(() => {
    const m = document.getElementById('more-menu');
    return {
      open: !m.hidden,
      share: !!m.querySelector('#share-btn'),
      about: !!m.querySelector('#about-btn'),
      kofi: !!m.querySelector('a[href^="https://ko-fi.com/"]'),
    };
  });
  check(menu.open && menu.share && menu.about && menu.kofi, `menu opens with Share, About and Support (${JSON.stringify(menu)})`);
  await page.keyboard.press('Escape');
  check(await page.evaluate(() => document.getElementById('more-menu').hidden), 'Escape closes the menu');

  await page.evaluate(() => window.hg.setDate('1914-07-28'));
  await page.waitForTimeout(600);
  const on = await page.evaluate(() => ({ p: document.getElementById('events-btn').getAttribute('aria-pressed'), f: window.hg.globe.map.getFilter('events') }));
  check(on.p === 'true' && !isOff(on.f), 'events shown and button pressed by default');
  await page.click('#events-btn');
  await page.waitForTimeout(600);
  const off = await page.evaluate(() => ({ p: document.getElementById('events-btn').getAttribute('aria-pressed'), f: window.hg.globe.map.getFilter('events') }));
  check(off.p === 'false' && isOff(off.f), 'Events button hides the dots');
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('hg-layers')).events === false), 'choice is remembered');

  await page.evaluate(() => window.hg.setDate('50000 BC'));
  await page.waitForTimeout(600);
  check(await page.evaluate(() => JSON.stringify(window.hg.globe.map.getFilter('human-sites')) !== JSON.stringify(['boolean', false])), 'early-human sites show before 1500 even with old human:false stored');
  await page.close();
}

console.log(errors.length ? errors : 'no page errors');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
