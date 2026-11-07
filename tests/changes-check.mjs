// Headless check of the "what changed" outline against a running dev server (npm run dev -- --port 5174).
import { chromium } from 'playwright-core';
const URL = process.env.HG_URL || 'http://localhost:5174/';
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.waitForFunction(() => window.hg?.globe.map.loaded(), null, { timeout: 30000 });
await page.evaluate(() => window.hg.setDate('1990-10-02'));
await page.waitForTimeout(1500);
await page.click('#next');
await page.waitForFunction(() => /^Changed:/.test(document.getElementById('toast').textContent) && !document.getElementById('toast').hidden, null, { timeout: 10000 }).catch(() => {});
const r = await page.evaluate(() => {
  const g = window.hg.globe;
  const flashed = g.current.features.filter((f) => g.map.getFeatureState({ source: 'borders', id: f.id }).flash).length;
  return { date: document.getElementById('date-input').value, toast: document.getElementById('toast').textContent, flashed };
});
const ok = /Germany/.test(r.toast) && r.flashed > 0;
console.log(ok ? 'PASS' : 'FAIL', JSON.stringify(r), errors);
await page.screenshot({ path: process.argv[2] ?? 'changes.png' }).catch(() => {});
await browser.close();
process.exit(ok && !errors.length ? 0 : 1);
