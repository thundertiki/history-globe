// Build public/data/search.json: one row per polity name, for the search box. Run after build.mjs.
// Row: [name, tier, key, from, to]. Tier A: key = name, from/to = first/last snapshot year (numbers).
// Tier B: key = CShapes gwcode, from/to = ISO days the name was in use (gwcode's runs merged per name).
import { readFileSync, writeFileSync } from 'node:fs';

const rows = [];
const presence = JSON.parse(readFileSync('public/data/presence.json', 'utf8'));
for (const [name, years] of Object.entries(presence)) {
  if (!name.trim()) continue;
  rows.push([name, 'A', name, Math.min(...years), Math.max(...years)]);
}

const topo = JSON.parse(readFileSync('public/data/borders/b/cshapes.json', 'utf8'));
const MAX = 6;
const byGw = new Map();
for (const g of topo.objects.borders.geometries) {
  const p = g.properties;
  const list = [[p.start, p.n0 ?? p.country_name]];
  for (let k = 1; k < MAX && p[`f${k}`]; k++) list.push([p[`f${k}`], p[`n${k}`]]);
  list.forEach(([from, name], k) => {
    const to = k + 1 < list.length ? list[k + 1][0] : p.end;
    const m = byGw.get(String(p.gwcode)) ?? new Map();
    const cur = m.get(name);
    if (!cur) m.set(name, [from, to]);
    else m.set(name, [from < cur[0] ? from : cur[0], to > cur[1] ? to : cur[1]]);
    byGw.set(String(p.gwcode), m);
  });
}
// Colonies share names ("Russian Empire" has several codes): keep one row per name, the longest-lived code.
const best = new Map();
for (const [gw, m] of byGw)
  for (const [name, [from, to]] of m) {
    const span = Date.parse(to) - Date.parse(from);
    if (!best.has(name) || best.get(name).span < span) best.set(name, { gw, from, to, span });
  }
for (const [name, b] of best) rows.push([name.replace(/�/g, ''), 'B', b.gw, b.from, b.to]);

writeFileSync('public/data/search.json', JSON.stringify(rows));
console.log('search rows:', rows.length, 'A', rows.filter((r) => r[1] === 'A').length);
