// Headless check of era tabs and "Next change" against a running dev server (npm run dev -- --port 5174).
import { chromium } from 'playwright-core';
const URL = process.env.HG_URL || 'http://localhost:5174/';
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.waitForFunction(() => window.hg?.globe.map.loaded(), null, { timeout: 30000 });
const state = () => page.evaluate(() => ({
  date: document.getElementById('date-input').value,
  on: document.querySelector('.era.on')?.textContent,
  min: document.getElementById('slider').min, max: document.getElementById('slider').max,
  ends: [...document.querySelectorAll('.timebar .row.small > span')].map((s) => s.textContent),
  toast: document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent,
}));
const out = [];
out.push(['start', await state()]);
await page.click('.era:has-text("Medieval")');
await page.waitForTimeout(800);
out.push(['medieval', await state()]);
await page.click('.era.change');
await page.waitForTimeout(1500);
out.push(['next change', await state()]);
await page.click('.era:has-text("1945–now")');
await page.waitForTimeout(1500);
out.push(['1945-now', await state()]);
for (const [k, v] of out) console.log(k, JSON.stringify(v));
await page.screenshot({ path: process.argv[2] ?? 'eras.png' });
const ok = out[1][1].on === 'Medieval' && out[1][1].date === 'AD 500' && out[3][1].on === '1945–now' && !errors.length;
console.log(ok ? 'PASS' : 'FAIL', errors);
await browser.close();
process.exit(ok ? 0 : 1);
