// Period-correct Wikipedia articles for old-map names that match a modern country ("Egypt" in 3000 BC).
// Checks every curated title in pipeline/eras.json, and builds the "History of <country>" fallback for other
// names matched to a modern country. Output: public/data/eras.json = { eras: {name: [[from, label, title]]},
// history: {modernTitle: historyTitle} }. Run summaries.mjs afterwards (it picks up these titles).
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'history-globe-pipeline/0.1 (open-source educational map)';
const { _about, ...curated } = JSON.parse(readFileSync('pipeline/eras.json', 'utf8'));
const wiki = JSON.parse(readFileSync('public/data/wiki.json', 'utf8'));
const modern = [...new Set(Object.values(wiki.qids))];

async function resolve(titles) {
  const ok = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1' +
      '&prop=pageprops&ppprop=disambiguation&titles=' + encodeURIComponent(titles.slice(i, i + 50).join('|'));
    const j = await (await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })).json();
    const norm = Object.fromEntries((j.query.normalized || []).map((n) => [n.from, n.to]));
    const redir = Object.fromEntries((j.query.redirects || []).map((n) => [n.from, n.to]));
    const pages = Object.fromEntries(j.query.pages.map((p) => [p.title, p]));
    for (const t of titles.slice(i, i + 50)) {
      const p = pages[redir[norm[t] || t] || norm[t] || t];
      if (p && !p.missing && p.pageprops?.disambiguation === undefined) ok.set(t, p.title);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return ok;
}

const curatedTitles = [...new Set(Object.values(curated).flatMap((l) => l.map((e) => e[2])))];
const historyTitles = modern.map((t) => `History of ${t.replace(/^The /, 'the ')}`);
const ok = await resolve([...curatedTitles, ...historyTitles]);

const eras = {};
const bad = [];
for (const [name, list] of Object.entries(curated)) {
  eras[name] = list.map(([from, label, t]) => {
    if (!ok.has(t)) bad.push(`${name}: ${t}`);
    return [from, label, ok.get(t) ?? null];
  });
}
const history = {};
modern.forEach((t, i) => { if (ok.has(historyTitles[i])) history[t] = ok.get(historyTitles[i]); });
writeFileSync('public/data/eras.json', JSON.stringify({ eras, history }));
console.log(`${Object.keys(eras).length} curated names, ${Object.keys(history).length} history fallbacks`);
if (bad.length) console.log('Not found:\n' + bad.join('\n'));
