// Rulers and capitals for the info card, from Wikidata (CC0), at build time. Run after entities.mjs.
// Output: public/data/rulers.json = { qid: { h: [[from, to, name], ...], c: [[from, to, name], ...] } }
//   h = head of state (P35), falling back to head of government (P6) when a polity has no head of state listed;
//   c = capital (P36). from/to are astronomical years (1 BC = 0), null = open on that side.
// Only statements with a start or end date are kept, plus a polity's sole undated capital.
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'history-globe-pipeline/0.1 (open-source educational map)';
const entities = JSON.parse(readFileSync('public/data/entities.json', 'utf8'));
const qids = [...new Set(Object.values(entities).map((e) => e.qid).filter(Boolean))];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(sparql) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql), {
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
    });
    if (r.ok) return (await r.json()).results.bindings;
    await sleep(3000 * (attempt + 1)); // 429 or timeout: back off
  }
  throw new Error('Wikidata query failed');
}

// Year of an XSD dateTime ("-0043-03-15T00:00:00Z" is astronomical -43).
const yearOf = (s) => (s ? Number(s.slice(0, s.indexOf('-', 1) > 0 ? s.indexOf('-', 1) : 5)) : null);

const out = {};
const BATCH = 25;
for (let i = 0; i < qids.length; i += BATCH) {
  const vals = qids.slice(i, i + BATCH).map((q) => `wd:${q}`).join(' ');
  const rows = await run(`SELECT ?e ?prop ?vl ?s ?en WHERE {
    VALUES ?e { ${vals} }
    VALUES (?prop ?pq ?ps) { ("h" p:P35 ps:P35) ("g" p:P6 ps:P6) ("c" p:P36 ps:P36) }
    ?e ?pq ?st . ?st ?ps ?v .
    OPTIONAL { ?st pqv:P580 [wikibase:timeValue ?s] }
    OPTIONAL { ?st pqv:P582 [wikibase:timeValue ?en] }
    ?v rdfs:label ?vl . FILTER(LANG(?vl) = "en")
  }`);
  for (const b of rows) {
    const q = b.e.value.split('/').pop();
    const o = (out[q] ??= { h: [], g: [], c: [] });
    o[b.prop.value].push([yearOf(b.s?.value), yearOf(b.en?.value), b.vl.value]);
  }
  process.stdout.write(`\r${Math.min(i + BATCH, qids.length)}/${qids.length}`);
  await sleep(1200);
}
console.log();

const byStart = (a, b) => (a[0] ?? -1e9) - (b[0] ?? -1e9);
const final = {};
for (const [q, o] of Object.entries(out)) {
  const dated = (l) => l.filter((r) => r[0] !== null || r[1] !== null).sort(byStart);
  const h = dated(o.h.length ? o.h : o.g);
  // A lone undated capital is "always"; several undated ones are ambiguous, so skipped.
  const c = dated(o.c);
  const undated = o.c.filter((r) => r[0] === null && r[1] === null);
  if (!c.length && undated.length === 1) c.push(undated[0]);
  if (h.length || c.length) final[q] = { ...(h.length && { h }), ...(c.length && { c }) };
}
writeFileSync('public/data/rulers.json', JSON.stringify(final));
console.log('polities with data:', Object.keys(final).length, 'of', qids.length);
