// Headless check that the card shows a ruler and capital (npm run dev -- --port 5174).
import { chromium } from 'playwright-core';
const URL = process.env.HG_URL || 'http://localhost:5174/';
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.waitForFunction(() => window.hg?.globe.map.loaded(), null, { timeout: 30000 });
// [date, name, CShapes gwcode, expected text]: head of state on that date (Wulff, not Merkel, who is head of government)
const cases = [['2010-05-01', 'Germany', '260', 'Wulff'], ['2010-05-01', 'France', '220', 'Sarkozy']];
let fail = 0;
for (const [d, q, key, want] of cases) {
  await page.evaluate((d) => window.hg.setDate(d), d);
  await page.waitForTimeout(1500);
  await page.evaluate((a) => window.hg.goTo({ name: a.q, tier: 'B', key: a.key, date: a.d, span: '' }), { q, key, d });
  await page.waitForFunction(() => /Ruler|Capital/.test(document.querySelector('#panel .meta')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
  const meta = await page.evaluate(() => document.querySelector('#panel .meta')?.textContent);
  const ok = meta?.includes(want);
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', d, q, '->', meta);
}
console.log('errors:', errors);
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
