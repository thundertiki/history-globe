// Headless check of the search box against a running dev server (npm run dev -- --port 5174).
import { chromium } from 'playwright-core';
const URL = process.env.HG_URL || 'http://localhost:5174/';
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.waitForFunction(() => window.hg?.globe.map.loaded(), null, { timeout: 30000 });
let fail = 0;
for (const [q, title, dateLike] of [['roman empire', 'Roman Empire', '0'], ['ussr', 'USSR', '19'], ['german democratic', 'German', '19']]) {
  await page.click('#search-btn');
  await page.fill('#search-input', q);
  const first = await page.textContent('#search-results li .sr-name');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.getElementById('panel').hidden && document.querySelector('#panel h2')?.textContent, null, { timeout: 15000 }).catch(() => {});
  const r = await page.evaluate(() => ({ h2: document.querySelector('#panel h2')?.textContent, date: document.getElementById('date-input').value, hash: location.hash, searchHidden: document.getElementById('search').hidden }));
  const ok = r.searchHidden && !!r.h2;
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', q, '->', first, JSON.stringify(r));
}
console.log('errors:', errors);
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
