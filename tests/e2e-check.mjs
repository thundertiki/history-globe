// Headless smoke check against a running dev server (npm run dev -- --port 5174).
// Uses the installed Microsoft Edge, so no browser download. Usage: node tests/e2e-check.mjs [shotDir]
import { chromium } from 'playwright-core';

const URL = process.env.HG_URL || 'http://localhost:5174/';
const shotDir = process.argv[2];
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));

await page.goto(URL);
await page.waitForFunction(() => window.hg?.globe.map.loaded(), null, { timeout: 30000 });

const checks = [
  ['500 BC', ['Achaemenid Empire']],
  ['1914-01-01', ['Austria-Hungary', 'Germany (Prussia)']],
  ['1990-10-02', ['German Democratic Republic']],
  ['1990-10-03', ['German Federal Republic']],
  ['2026-11-03', ['Germany', 'France']],
];
let fail = 0;
for (const [d, want] of checks) {
  const r = await page.evaluate(async ({ d, want }) => {
    await window.hg.setDate(d);
    const m = window.hg.globe.map;
    const t0 = Date.now();
    while (!m.isSourceLoaded('borders') && Date.now() - t0 < 10000) await new Promise((res) => setTimeout(res, 100));
    // 'idle' can be slow or missed under software rendering; cap the wait.
    await Promise.race([new Promise((res) => m.once('idle', res)), new Promise((res) => setTimeout(res, 4000))]);
    // Whole-viewport queryRenderedFeatures is unreliable on the globe projection; query the source with the
    // same filter the layers use instead.
    const filter = m.getFilter('borders-fill') ?? undefined;
    const names = new Set(m.querySourceFeatures('borders', { filter }).map((f) => f.properties._name));
    return {
      label: document.getElementById('date-input').value,
      prec: document.getElementById('precision').textContent,
      count: names.size,
      missing: want.filter((w) => !names.has(w)),
      gdr: names.has('German Democratic Republic'),
    };
  }, { d, want });
  const ok = r.missing.length === 0 && !(d === '1990-10-03' && r.gdr);
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', d, JSON.stringify(r));
  if (shotDir) await page.screenshot({ path: `${shotDir}/${d}.png` });
}

// Tap France today and wait for the Wikipedia blurb.
await page.evaluate(() => window.hg.globe.map.jumpTo({ center: [2.5, 46.5], zoom: 4 }));
await page.evaluate(() =>
  Promise.race([new Promise((res) => window.hg.globe.map.once('idle', res)), new Promise((res) => setTimeout(res, 5000))])
);
await page.mouse.click(640, 400);
const blurb = await page
  .waitForFunction(() => document.querySelector('#wiki p:not(.src)')?.textContent?.length > 40, null, { timeout: 15000 })
  .then(() => page.evaluate(() => document.querySelector('#panel h2').textContent))
  .catch(() => null);
console.log(blurb ? 'PASS' : 'FAIL', 'tap panel:', blurb);
if (!blurb) fail++;
if (shotDir) await page.screenshot({ path: `${shotDir}/panel.png` });

console.log(errors.length ? 'ERRORS ' + JSON.stringify(errors) : 'no page errors');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
