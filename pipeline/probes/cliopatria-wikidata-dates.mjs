// Share of Cliopatria polities whose Wikidata item has inception/dissolution dates, and at what precision.
import { readFileSync, writeFileSync } from 'node:fs';
const fs = JSON.parse(readFileSync(process.argv[2], 'utf8')).features;
const byQ = new Map();
for (const f of fs) {
  const q = f.properties.Wikidata;
  if (!q) continue;
  const e = byQ.get(q) ?? { name: f.properties.Name, from: 1e9, to: -1e9 };
  e.from = Math.min(e.from, f.properties.FromYear); e.to = Math.max(e.to, f.properties.ToYear);
  byQ.set(q, e);
}
const qs = [...byQ.keys()];
console.log('polities', new Set(fs.map((f) => f.properties.Name)).size, 'with Wikidata id', qs.length, 'records without', fs.filter((f) => !f.properties.Wikidata).length);
const res = new Map();
for (let i = 0; i < qs.length; i += 150) {
  const vals = qs.slice(i, i + 150).map((q) => `wd:${q.replace(/^.*\//, '')}`).join(' ');
  const q = `SELECT ?s ?p ?t ?prec WHERE { VALUES ?s { ${vals} } VALUES ?pp { p:P571 p:P580 p:P576 p:P582 } ?s ?pp ?st . ?st ?ps ?t . ?st psv:P571|psv:P580|psv:P576|psv:P582 ?v . ?v wikibase:timePrecision ?prec . BIND(IF(?pp IN (p:P571, p:P580), "start", "end") AS ?p) FILTER(?ps IN (ps:P571, ps:P580, ps:P576, ps:P582)) }`;
  const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { headers: { 'User-Agent': 'history-globe-research/0.1 (github.com/thundertiki/history-globe)', Accept: 'application/sparql-results+json' } });
  if (!r.ok) { console.log('batch', i, r.status, (await r.text()).slice(0, 200)); continue; }
  for (const b of (await r.json()).results.bindings) {
    const id = b.s.value.replace(/^.*\//, '');
    const o = res.get(id) ?? {};
    o[b.p.value] = Math.max(o[b.p.value] ?? 0, Number(b.prec.value));
    res.set(id, o);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
let n = 0, start = 0, end = 0, startDay = 0, endDay = 0, endNeeded = 0, endDayNeeded = 0, startMod = 0, startDayMod = 0;
for (const [q, e] of byQ) {
  const id = q.replace(/^.*\//, '');
  const r = res.get(id) ?? {};
  n++;
  if (r.start) start++;
  if (r.start === 11) startDay++;
  if (r.end) end++;
  if (r.end === 11) endDay++;
  if (e.to < 2024) { endNeeded++; if (r.end === 11) endDayNeeded++; }
  if (e.from >= 1850) { startMod++; if (r.start === 11) startDayMod++; }
}
console.log({ n, withStart: start, startDay, withEnd: end, endDay, endedPolities: endNeeded, endedWithDay: endDayNeeded, polities1850plus: startMod, startedWithDay: startDayMod });
