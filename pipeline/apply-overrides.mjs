// Apply pipeline/entity-overrides.json to public/data/entities.json without re-running the slow full match.
// Each override title is checked against Wikipedia (redirects followed, disambiguation pages rejected).
// Names whose title fails are listed so the override can be fixed. Then run summaries.mjs (incremental).
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'history-globe-pipeline/0.1 (open-source educational map)';
const overrides = JSON.parse(readFileSync('pipeline/entity-overrides.json', 'utf8'));
const entities = JSON.parse(readFileSync('public/data/entities.json', 'utf8'));
const unmatched = new Set(readFileSync('pipeline/unmatched.txt', 'utf8').split('\n').filter(Boolean));

// Names new since the last full match (e.g. newly added snapshots) are tried as written.
const presence = JSON.parse(readFileSync('public/data/presence.json', 'utf8'));
const fresh = Object.keys(presence).filter((n) => !entities[n] && !unmatched.has(n) && !(n in overrides) && n.trim());
const pairs = [...Object.entries(overrides).filter(([, t]) => t), ...fresh.map((n) => [n, n])];
console.log(fresh.length, 'new names to try');
const titles = [...new Set(pairs.map(([, t]) => t))];
const ok = new Map();
for (let i = 0; i < titles.length; i += 50) {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1' +
    '&prop=pageprops&ppprop=wikibase_item|disambiguation&titles=' + encodeURIComponent(titles.slice(i, i + 50).join('|'));
  const j = await (await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })).json();
  const norm = Object.fromEntries((j.query.normalized || []).map((n) => [n.from, n.to]));
  const redir = Object.fromEntries((j.query.redirects || []).map((n) => [n.from, n.to]));
  const pages = Object.fromEntries(j.query.pages.map((p) => [p.title, p]));
  for (const t of titles.slice(i, i + 50)) {
    const p = pages[redir[norm[t] || t] || norm[t] || t];
    if (p && !p.missing && p.pageprops?.disambiguation === undefined)
      ok.set(t, { title: p.title, qid: p.pageprops?.wikibase_item || null });
  }
  await new Promise((r) => setTimeout(r, 1500));
}
const bad = [];
for (const [name, t] of pairs) {
  if (ok.has(t)) { entities[name] = ok.get(t); unmatched.delete(name); }
  else if (name in overrides) bad.push(`${name} -> ${t}`);
  else unmatched.add(name);
}
writeFileSync('public/data/entities.json', JSON.stringify(entities));
writeFileSync('pipeline/unmatched.txt', [...unmatched].join('\n') + '\n');
console.log(`${pairs.length - bad.length} overrides applied, ${unmatched.size} names still unmatched`);
if (bad.length) console.log('Titles not found:\n' + bad.join('\n'));
