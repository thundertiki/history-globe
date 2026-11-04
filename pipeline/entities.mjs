// Map every border name to an English Wikipedia title + Wikidata QID, at build time.
// Names: tier A NAME/SUBJECTO, tier B modern country_name and period names (n0..n5).
// Each name is tried as written, then with suffixes like "(FR)" or "/ alt name" removed, then as
// "<name> people" and "<name> culture" (most unmatched historical-basemaps names are peoples and cultures).
// Disambiguation pages never count as a match.
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
for (const p of props(join(B, 'b', 'cshapes.json'))) {
  if (p.country_name) names.add(p.country_name);
  for (let k = 0; k < 6; k++) if (p[`n${k}`]) names.add(p[`n${k}`]);
}

const stripped = (n) =>
  n
    .replace(/\s*\([^)]*\)/g, '') // "Algeria (FR)" -> "Algeria"
    .split(/\s*\/\s*/)[0] // "Abenaki / Abénaquis" -> "Abenaki"
    .replace(/[^\p{L}\p{N}\s'’.-]/gu, '') // drop stray symbols and other scripts
    .trim();
const candidates = (name) => {
  if (name in overrides) return overrides[name] ? [overrides[name]] : [];
  const s = stripped(name);
  return [...new Set([name, s, s && `${s} people`, s && `${s} culture`].filter(Boolean))];
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resolve up to 50 titles; returns Map(requested title -> {title, qid}) for real articles only. */
async function resolve(titles) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1' +
    '&prop=pageprops&ppprop=wikibase_item|disambiguation&titles=' +
    encodeURIComponent(titles.join('|'));
  let j;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.ok) { j = await res.json(); break; }
    if (attempt >= 6) throw new Error(`Wikipedia API ${res.status} after retries`);
    const wait = Number(res.headers.get('retry-after')) * 1000 || 5000 * 2 ** attempt;
    console.log(`rate limited (${res.status}), waiting ${wait / 1000}s`);
    await sleep(wait);
  }
  const norm = Object.fromEntries((j.query.normalized || []).map((n) => [n.from, n.to]));
  const redir = Object.fromEntries((j.query.redirects || []).map((n) => [n.from, n.to]));
  const pages = Object.fromEntries(j.query.pages.map((p) => [p.title, p]));
  const out = new Map();
  for (const t of titles) {
    let x = norm[t] || t;
    x = redir[x] || x;
    const p = pages[x];
    if (p && !p.missing && !p.invalid && p.pageprops?.disambiguation === undefined)
      out.set(t, { title: p.title, qid: p.pageprops?.wikibase_item || null });
  }
  await sleep(1500);
  return out;
}

// Try candidate level 0 for every name, then level 1 for those still unmatched, and so on.
const all = [...names].sort();
const out = {};
let pending = all;
for (let level = 0; level < 4 && pending.length; level++) {
  const ask = pending.map((n) => [n, candidates(n)[level]]).filter(([, c]) => c);
  for (let i = 0; i < ask.length; i += 50) {
    const batch = ask.slice(i, i + 50);
    const found = await resolve([...new Set(batch.map(([, c]) => c))]);
    for (const [n, c] of batch) if (found.has(c)) out[n] = found.get(c);
  }
  pending = pending.filter((n) => !out[n]);
  console.log(`level ${level}: ${all.length - pending.length} matched, ${pending.length} left`);
}

writeFileSync('public/data/entities.json', JSON.stringify(out));
writeFileSync('pipeline/unmatched.txt', pending.join('\n') + '\n');
console.log(`${Object.keys(out).length} matched, ${pending.length} unmatched of ${all.length}`);
