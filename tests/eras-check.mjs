// Headless check of era tabs, Next change and speed against a running dev server (npm run dev -- --port 5174).
import { chromium } from 'playwright-core';
const URL = process.env.HG_URL || 'http://localhost:5174/';
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let fail = 0;
const check = (ok, msg) => { if (!ok) fail++; console.log(ok ? 'PASS' : 'FAIL', msg); };

for (const width of [320, 360, 375, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.hg?.globe.map.loaded(), null, { timeout: 30000 });
  await page.click('.era:nth-child(3)');
  await page.waitForTimeout(400);
  const layout = await page.evaluate(() => {
    const eras = document.getElementById('eras');
    const row = document.querySelector('.timebar .row');
    const tabs = [...document.querySelectorAll('.era')];
    const bar = document.querySelector('.timebar').getBoundingClientRect();
    const nc = document.getElementById('next-change');
    const ncr = nc?.getBoundingClientRect();
    return {
      tabs: tabs.map((t) => t.textContent),
      noScroll: eras.scrollWidth <= eras.clientWidth,
      nextInRow: !!nc && row.contains(nc),
      nextVisible: !!ncr && ncr.right <= bar.right + 1 && ncr.left >= bar.left - 1,
      noSpeed: !document.getElementById('speed'),
      dateFits: (() => { const i = document.getElementById('date-input'); return i.scrollWidth <= i.clientWidth; })(),
      tabsFit: tabs.every((t) => t.scrollWidth <= t.clientWidth),
    };
  });
  const want = width < 360 ? ['Pre', 'Anc.', 'Med.', '1500s', '1800s', '1945+'] : ['Pre', 'Ancient', 'Medieval', '1500s', '1800s', '1945+'];
  check(JSON.stringify(layout.tabs) === JSON.stringify(want), `${width}px tab labels ${layout.tabs}`);
  check(layout.dateFits, `${width}px full date (with year) fits in its box`);
  check(layout.tabsFit, `${width}px no tab label is cut off`);
  check(layout.noScroll, `${width}px tabs fit without scrolling`);
  check(layout.nextInRow && layout.nextVisible, `${width}px Next change is in row 1 and on screen`);
  check(layout.noSpeed, `${width}px speed button removed`);

  if (width === 390) {
    const date = () => page.inputValue('#date-input');
    const before = await date();
    await page.click('.era:has-text("Medieval")');
    await page.waitForTimeout(800);
    check((await date()) === 'AD 500', 'Medieval tab jumps to AD 500');
    await page.click('#next-change');
    await page.waitForTimeout(1500);
    check((await date()) === 'AD 600', `Next change moved to the next snapshot (was ${before})`);
    // Tap plays; long press changes speed and must not also toggle play.
    await page.click('#play');
    const playing = await page.evaluate(() => document.getElementById('play').textContent);
    await page.click('#play');
    const box = await page.locator('#play').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    const after = await page.evaluate(() => ({ label: document.getElementById('play').textContent, toast: document.getElementById('toast').textContent }));
    check(playing === '❚❚', 'tap on play starts playback');
    check(after.label === '▶' && /Speed 3×/.test(after.toast), `long press shows speed and does not toggle play (${after.label}, ${after.toast})`);
  }
  await page.close();
}
console.log(errors.length ? errors : 'no page errors');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
