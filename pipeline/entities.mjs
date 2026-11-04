// Map every border name (tier A NAME/SUBJECTO, tier B country_name) to an English Wikipedia title + Wikidata QID.
// Uses the Wikipedia query API in batches of 50 at build time; the client never queries Wikidata directly.
// Output: public/data/entities.json, plus pipeline/unmatched.txt for review.
// Manual fixes: pipeline/entity-overrides.json  { "Border name": "Wikipedia title" | null }
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const B = 'public/data/borders';
const UA = 'history-globe-pipeline/0.1 (open-source educational map)';
const overrides = existsSync('pipeline/entity-overrides.json')
  ? JSON.parse(readFileSync('pipeline/entity-overrides.json', 'utf8'))
  : {};

const names = new Set();
const props = (file) => {
  const t = JSON.parse(readFileSync(file, 'utf8'));
  return Object.values(t.objects).flatMap((o) => o.geometries.map((g) => g.properties || {}));
};
for (const f of readdirSync(join(B, 'a'))) for (const p of props(join(B, 'a', f))) {
  if (p.NAME) names.add(p.NAME);
  if (p.SUBJECTO) names.add(p.SUBJECTO);
}
for (const p of props(join(B, 'b', 'cshapes.json'))) names.add(p.country_name);

const query = (name) => (name in overrides ? overrides[name] : name);
const all = [...names].sort();
const out = {};
const unmatched = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < all.length; i += 50) {
  const batch = all.slice(i, i + 50).filter((n) => query(n));
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1' +
    '&prop=pageprops&ppprop=wikibase_item|disambiguation&titles=' +
    encodeURIComponent(batch.map(query).join('|'));
  let j;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.ok) { j = await res.json(); break; }
    if (attempt >= 5) throw new Error(`Wikipedia API ${res.status} after retries`);
    const wait = Number(res.headers.get('retry-after')) * 1000 || 5000 * 2 ** attempt;
    console.log(`rate limited (${res.status}), waiting ${wait / 1000}s`);
    await sleep(wait);
  }
  const norm = Object.fromEntries((j.query.normalized || []).map((n) => [n.from, n.to]));
  const redir = Object.fromEntries((j.query.redirects || []).map((n) => [n.from, n.to]));
  const pages = Object.fromEntries(j.query.pages.map((p) => [p.title, p]));
  for (const name of batch) {
    let t = query(name);
    t = norm[t] || t;
    t = redir[t] || t;
    const p = pages[t];
    if (!p || p.missing || p.invalid || p.pageprops?.disambiguation !== undefined) unmatched.push(name);
    else out[name] = { title: p.title, qid: p.pageprops?.wikibase_item || null };
  }
  await sleep(1500);
}
for (const n of all) if (!query(n)) unmatched.push(n + '  (override: null)');

writeFileSync('public/data/entities.json', JSON.stringify(out));
writeFileSync('pipeline/unmatched.txt', unmatched.join('\n') + '\n');
console.log(`${Object.keys(out).length} matched, ${unmatched.length} unmatched of ${all.length}`);
