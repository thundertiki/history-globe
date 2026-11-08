// Usage: node render.mjs <geojson> <outdir> <year...>. Draws each year's polygons on a flat map, area coverage and names.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const [, , file, out, ...ys] = process.argv;
const fs = JSON.parse(readFileSync(file, 'utf8')).features;
const color = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 55% 50%)`; };
const W = 1400, H = 700;
const px = ([x, y]) => `${((x + 180) / 360 * W).toFixed(1)},${((90 - y) / 180 * H).toFixed(1)}`;
const ring = (r) => 'M' + r.filter((_, i) => i % 3 === 0 || i === r.length - 1).map(px).join('L') + 'Z';
const path = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((p) => p.map(ring).join('')).join('');
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const y of ys.map(Number)) {
  const alive = fs.filter((f) => f.properties.FromYear <= y && f.properties.ToYear >= y && f.geometry);
  const area = alive.reduce((a, f) => a + (f.properties.Area || 0), 0);
  console.log(y, 'polities', alive.length, 'area Mkm2', (area / 1e6).toFixed(1), 'names', alive.map((f) => f.properties.Name).slice(0, 25).join(' | '));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#16304d">${alive.map((f) => `<path d="${path(f.geometry)}" fill="${color(f.properties.Name)}" stroke="#111" stroke-width="0.4"/>`).join('')}</svg>`;
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.screenshot({ path: `${out}/clio-${y}.png` });
}
await browser.close();
