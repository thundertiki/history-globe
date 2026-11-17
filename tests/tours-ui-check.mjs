// Headless check of guided tours against a running dev server (npm run dev -- --port 5174).
// TOUR (default "sample", served from tests/fixtures) names the tour. The bloc checks need a tour with blocs.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const URL = process.env.HG_URL || 'http://localhost:5174/';
const TOUR = process.env.TOUR || 'sample';
const SHOTS = process.env.SHOTS; // optional folder for screenshots
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let fail = 0;
const check = (ok, msg) => { if (!ok) fail++; console.log(ok ? 'PASS' : 'FAIL', msg); };

// The sample tour (blocs, treaty lines, a flat stop) is a test fixture: serve it as if it were listed.
const SAMPLE = readFileSync(new globalThis.URL('./fixtures/sample-tour.json', import.meta.url), 'utf-8');
async function serveSample(page) {
  const s = JSON.parse(SAMPLE);
  const items = s.sections.reduce((n, x) => n + 1 + x.items.length, 0);
  await page.route('**/data/tours/index.json', async (route) => {
    const res = await route.fetch();
    const list = await res.json();
    route.fulfill({ response: res, json: [...list, { id: s.id, title: s.title, years: s.years, summary: s.summary, items }] });
  });
  await page.route('**/data/tours/sample.json', (route) => route.fulfill({ contentType: 'application/json', body: SAMPLE }));
}

async function open(width, hash = '') {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  page.on('pageerror', (e) => errors.push(`${width}px: ${e.message}`));
  if (TOUR === 'sample') await serveSample(page);
  await page.goto(URL + hash);
  await page.waitForFunction(() => window.hg?.globe.map.loaded(), null, { timeout: 30000 });
  return page;
}
const tourState = (page) => page.evaluate(() => window.hg.tour());
const idle = (page) => page.waitForFunction(() => !window.hg.globe.map.isMoving(), null, { timeout: 15000 }).then(() => page.waitForTimeout(300));
/** Map state the tour put on the borders: features with a bloc colour or a highlight, the arrows, the projection. */
const mapState = (page) => page.evaluate(() => {
  const g = window.hg.globe;
  const ids = (g.current?.features ?? []).map((f) => f.id);
  const st = ids.map((id) => g.map.getFeatureState({ source: 'borders', id }));
  const arrows = g.map.querySourceFeatures('tour-arrows').length;
  return { blocs: st.filter((s) => s.bloc).length, hl: st.filter((s) => s.hl).length, arrows, proj: g.map.getProjection()?.type ?? 'globe' };
});

for (const width of [390, 1280]) {
  const page = await open(width);
  const tag = `${width}px:`;
  await page.click('#more-btn');
  check(await page.isVisible('#tours-btn'), `${tag} menu has Tours`);
  await page.click('#tours-btn');
  await page.waitForSelector('.tour-row');
  check(await page.locator('.tour-row').count() >= 1, `${tag} Tours opens the list`);
  const row = await page.evaluate((id) => fetch('data/tours/index.json').then((r) => r.json()).then((l) => l.findIndex((t) => t.id === id)), TOUR);
  await page.locator('.tour-row').nth(row).click();
  await page.waitForFunction(() => window.hg.tour());
  check((await tourState(page)).id === TOUR, `${tag} picking a tour opens it`);
  check(await page.locator('.tour-sec').count() >= 1, `${tag} the tour shows its sections`);

  // First item: date and link follow it.
  await page.locator('.tour-item').nth(1).click();
  await page.waitForFunction(() => /^#tour=/.test(location.hash) && location.hash.split('/').length === 2);
  const s1 = await tourState(page);
  check((await page.evaluate(() => location.hash)) === `#tour=${s1.id}/${s1.stop}`, `${tag} link is #tour=<tour>/<stop>`);
  await idle(page);

  // Three quick ▶ taps: the map ends on the stop three ahead, with that stop's map state.
  const start = await page.evaluate(() => Number(document.querySelector('.tour-nav .count').textContent.split('/')[0]));
  for (let i = 0; i < 3; i++) await page.click('.tour-nav button[aria-label="Next stop"]');
  await page.waitForFunction((n) => document.querySelector('.tour-nav .count')?.textContent.startsWith(`${n} /`), start + 3);
  await idle(page);
  const want = await page.evaluate(async () => {
    const st = window.hg.tour();
    const t = await fetch(`data/tours/${st.id}.json`).then((r) => r.json());
    const stop = t.sections.flatMap((s) => [s, ...s.items]).find((s) => s.id === st.stop);
    return { iso: stop.date, flat: stop.view === 'flat', blocs: Boolean(stop.blocs), hl: (stop.highlight ?? []).length };
  });
  const got = await page.evaluate(() => window.hg.pick().iso);
  check(got === want.iso,`${tag} after quick ▶ taps the borders show the last stop's date (${got} vs ${want.iso})`);
  const ms = await mapState(page);
  check((ms.proj === 'mercator') === want.flat, `${tag} flat view follows the stop (${ms.proj})`);
  check((ms.blocs > 0) === want.blocs, `${tag} bloc shading follows the stop (${ms.blocs})`);
  check((ms.hl > 0) === (want.hl > 0), `${tag} highlight follows the stop (${ms.hl})`);

  // Walk on until a stop with blocs, so exiting has something to clear.
  for (let i = 0; i < 6 && !(await mapState(page)).blocs; i++) {
    if (await page.isDisabled('.tour-nav button[aria-label="Next stop"]')) break;
    await page.click('.tour-nav button[aria-label="Next stop"]');
    await idle(page);
  }
  const shaded = await mapState(page);
  check(shaded.blocs > 0 && shaded.hl > 0, `${tag} a later stop shades blocs and outlines its polity (${shaded.blocs}, ${shaded.hl})`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tour-${width}.png`, scale: 'css' });

  // A polity tapped during the tour opens its card with Back to tour; Back returns to the same stop.
  const before = await tourState(page);
  const pt = await page.evaluate(() => {
    const m = window.hg.globe.map;
    const f = window.hg.globe.current.features.find((x) => m.getFeatureState({ source: 'borders', id: x.id }).bloc);
    if (!f) return null;
    const c = m.project(m.getCenter());
    const hits = m.queryRenderedFeatures({ layers: ['borders-fill'] }).filter((x) => x.id === f.id);
    if (!hits.length) return { x: c.x, y: c.y };
    // A point inside that polity: try a grid until one hits it.
    const r = m.getCanvas().getBoundingClientRect();
    for (let y = 80; y < r.height - 200; y += 12) for (let x = 12; x < r.width - 12; x += 12) {
      const q = m.queryRenderedFeatures([x, y], { layers: ['borders-fill', 'events', 'human-sites', 'tour-arrows', 'tour-arrows-label'] });
      if (q.length && q[0].layer.id === 'borders-fill' && q[0].id === f.id) return { x, y };
    }
    return { x: c.x, y: c.y };
  });
  if (pt) {
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(500);
    check(await page.isVisible('#back-to-tour'), `${tag} a polity card during a tour has Back to tour`);
    check(JSON.stringify(await tourState(page)) === JSON.stringify(before), `${tag} the tour stays open under the card`);
    await page.click('#back-to-tour');
    check(await page.isVisible('#view-tour .tour-nav'), `${tag} Back to tour returns to the stop`);
  } else check(false, `${tag} found a shaded polity to tap`);

  // ✕ ends the tour and clears everything.
  await page.click('#panel-close');
  await page.waitForTimeout(400);
  const after = await mapState(page);
  check(!(await tourState(page)), `${tag} ✕ ends the tour`);
  check(after.proj === 'globe' && !after.blocs && !after.hl && !after.arrows, `${tag} ✕ clears shading, highlight, lines and flat view`);
  check(/^#-?\d/.test(await page.evaluate(() => location.hash)), `${tag} the normal link is back`);

  // Moving the slider during a tour ends it.
  await page.click('#more-btn');
  await page.click('#tours-btn');
  await page.waitForSelector('.tour-row');
  await page.locator('.tour-row').nth(row).click();
  await page.waitForFunction(() => window.hg.tour());
  await page.evaluate(() => {
    const s = document.getElementById('slider');
    s.value = String(Number(s.value) - 5);
    s.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(300);
  check(!(await tourState(page)), `${tag} moving the slider ends the tour`);
  await page.close();
}

// Links: a good link opens the stop; a bad one starts normally with a toast.
{
  const page = await open(1280, `#tour=${TOUR}`);
  await page.waitForFunction(() => window.hg.tour(), null, { timeout: 10000 }).catch(() => {});
  check(Boolean(await tourState(page)), 'a #tour= link opens the tour');
  await page.close();
  const bad = await open(1280, '#tour=nope/x');
  await bad.waitForTimeout(800);
  check(!(await tourState(bad)), 'an unknown tour link does not open a tour');
  check(/Tour not found/.test(await bad.evaluate(() => document.getElementById('toast').textContent)), 'an unknown tour link says "Tour not found"');
  await bad.close();
}

check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(fail ? `${fail} FAILED` : 'ALL PASS');
process.exit(fail ? 1 : 0);
