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

// ---- Bottom sheet (390 px) ----
{
  const page = await open(390);
  const info = () => page.evaluate(() => {
    const el = document.getElementById('panel');
    const m = window.hg.globe.map;
    const c = m.project(m.getCenter());
    return {
      state: el.hidden ? 'peek' : el.dataset.sheet, height: el.offsetHeight, top: el.getBoundingClientRect().top,
      pad: m.getPadding().bottom, zoom: m.getZoom(), cy: c.y, lng: m.getCenter().lng, lat: m.getCenter().lat,
      view: document.getElementById('view-search').hidden ? 'card' : 'search',
    };
  });
  const settle = () => page.waitForTimeout(900);
  // Map animations are slow under software rendering: wait for padding to match the sheet (or be zero).
  const caughtUp = (open) => page.waitForFunction((open) => {
    const el = document.getElementById('panel');
    const pad = window.hg.globe.map.getPadding().bottom;
    return open ? Math.abs(pad - el.offsetHeight) <= 6 : pad === 0;
  }, open, { timeout: 8000 }).catch(() => {});
  const peekEl = await page.evaluate(() => { const p = document.getElementById('peek'); return p && !p.hidden && /Tap a country/.test(p.textContent) && p.offsetHeight > 0; });
  check(peekEl, 'peek hint is visible when nothing is open');
  await page.evaluate(() => window.hg.setDate('1914-07-28'));
  await settle();
  await page.evaluate(() => window.hg.goTo({ name: 'France', tier: 'B', key: '220', date: '1914-07-28', span: '' }));
  await caughtUp(true);
  await settle();
  let i = await info();
  check(i.state === 'half', `card opens the sheet at half (${i.state})`);
  check(Math.abs(i.pad - i.height) <= 6, `map bottom padding follows the sheet height (${i.pad} vs ${i.height})`);
  check(i.cy < i.top, `map centre is above the sheet (y ${Math.round(i.cy)} < ${Math.round(i.top)})`);
  // Drag the handle up: sheet goes full, map must not pan.
  const g = await page.locator('#panel .grab').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + 4);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, g.y - 150, { steps: 6 });
  await page.mouse.up();
  await settle();
  const j = await info();
  check(j.state === 'full', `dragging the handle up opens full (${j.state})`);
  check(Math.abs(j.lng - i.lng) < 0.05 && Math.abs(j.lat - i.lat) < 0.05, 'dragging the handle does not pan the map');
  await page.keyboard.press('Escape');
  await caughtUp(false);
  await settle();
  let k = await info();
  check(k.state === 'peek' && k.pad === 0, `Escape returns to peek with padding cleared (${k.state}, ${k.pad})`);
  check(Math.abs(k.zoom - (i.zoom + 0.3)) < 0.1, `zoom restored after closing (${k.zoom.toFixed(2)}, was ${i.zoom.toFixed(2)} + 0.3 with the sheet open)`);
  // Changing the date with the sheet open must not leave padding stuck.
  await page.evaluate(() => window.hg.goTo({ name: 'France', tier: 'B', key: '220', date: '1914-07-28', span: '' }));
  await settle();
  await page.evaluate(() => window.hg.setDate('1920-01-01'));
  await settle();
  k = await info();
  check(k.state === 'peek' && k.pad === 0, `date change clears the sheet and padding (${k.state}, ${k.pad})`);
  // Search lives in the sheet at full height.
  await page.click('#search-btn');
  await settle();
  k = await info();
  check(k.state === 'full' && k.view === 'search', `search opens the sheet at full (${k.state}, ${k.view})`);
  await page.fill('#search-input', 'roman empire');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('view-search').hidden && document.querySelector('#panel h2')?.textContent, null, { timeout: 15000 }).catch(() => {});
  await settle();
  k = await info();
  check(k.state === 'half' && k.view === 'card', `choosing a result shows its card at half (${k.state}, ${k.view})`);
  await page.close();
}

// ---- Desktop keeps the right-hand card (1280 px) ----
{
  const page = await open(1280);
  await page.evaluate(() => window.hg.goTo({ name: 'France', tier: 'B', key: '220', date: '1914-07-28', span: '' }));
  await page.waitForTimeout(1500);
  const d = await page.evaluate(() => {
    const el = document.getElementById('panel');
    return {
      grab: getComputedStyle(el.querySelector('.grab')).display,
      peek: getComputedStyle(document.getElementById('peek')).display,
      right: el.getBoundingClientRect().left > window.innerWidth / 2,
      pad: window.hg.globe.map.getPadding().bottom,
    };
  });
  check(d.grab === 'none' && d.peek === 'none' && d.right && d.pad === 0, `desktop: right panel, no handle, no peek, no padding (${JSON.stringify(d)})`);
  await page.close();
}

console.log(errors.length ? errors : 'no page errors');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
