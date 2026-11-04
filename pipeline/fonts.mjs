// Download the label font's glyph ranges that the map's names actually use, into public/fonts/.
// The app serves glyphs itself so it works where other hosts are blocked (e.g. the Claude artifact).
// Source: MapLibre demo tiles fonts (Open Sans, Apache-2.0). Run after build.mjs.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const B = 'public/data/borders';
// Served as fonts/<stack>/<range>.pbf; the stack name has no spaces so the URL needs no escaping.
const OUT = 'public/fonts/OpenSansSemibold';
const FONT = 'Open Sans Semibold';
mkdirSync(OUT, { recursive: true });

const codepoints = new Set();
const add = (s) => { if (s) for (const ch of String(s)) codepoints.add(ch.codePointAt(0)); };
const files = [...readdirSync(join(B, 'a')).map((f) => join(B, 'a', f)), join(B, 'b', 'cshapes.json'), join(B, 'c', 'ne.json')];
for (const f of files) {
  const t = JSON.parse(readFileSync(f, 'utf8'));
  for (const g of t.objects.labels.geometries) {
    const p = g.properties || {};
    add(p.NAME); add(p.name);
    for (let k = 0; k < 6; k++) add(p[`n${k}`]);
  }
}
const ranges = [...new Set([...codepoints].filter((c) => c <= 0xffff).map((c) => Math.floor(c / 256) * 256))].sort((a, b) => a - b);
let got = 0;
for (const r of ranges) {
  const name = `${r}-${r + 255}.pbf`;
  // Stored as a base64 JSON string: some hosts (the Claude artifact) refuse to serve .pbf files.
  const out = `${r}-${r + 255}.json`;
  const dest = join(OUT, out);
  if (existsSync(dest)) continue;
  const res = await fetch(`https://demotiles.maplibre.org/font/${encodeURIComponent(FONT)}/${name}`);
  if (!res.ok) { console.log('no glyphs for', name); continue; }
  writeFileSync(dest, JSON.stringify(Buffer.from(await res.arrayBuffer()).toString('base64')));
  got++;
}
console.log(`${ranges.length} ranges needed, ${got} downloaded`);
