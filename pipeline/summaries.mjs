// Fetch Wikipedia intro summaries at build time, so the app makes no live calls to other sites
// (needed for the Claude artifact, whose sandbox blocks them). Run after entities.mjs.
// Output: public/data/wiki.json = { qids: {Q123: title}, pages: {title: {e: extract, t: thumbnail, u: url}} }
// Text is from Wikipedia, CC BY-SA 4.0; the app credits and links each article.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const UA = 'history-globe-pipeline/0.1 (open-source educational map)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(host, params) {
  const url = `https://${host}/w/api.php?format=json&formatversion=2&` + new URLSearchParams(params);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.ok) { await sleep(1200); return res.json(); }
    if (attempt >= 6) throw new Error(`${host} ${res.status} after retries`);
    const wait = Number(res.headers.get('retry-after')) * 1000 || 5000 * 2 ** attempt;
    console.log(`rate limited (${res.status}), waiting ${wait / 1000}s`);
    await sleep(wait);
  }
}

// Present-day countries carry Wikidata IDs; turn them into English Wikipedia titles.
const ne = JSON.parse(readFileSync('public/data/borders/c/ne.json', 'utf8'));
const qidList = [...new Set(ne.objects.borders.geometries.map((g) => g.properties?.qid).filter(Boolean))];
const qids = {};
for (let i = 0; i < qidList.length; i += 50) {
  const j = await api('www.wikidata.org', {
    action: 'wbgetentities', ids: qidList.slice(i, i + 50).join('|'), props: 'sitelinks', sitefilter: 'enwiki',
  });
  for (const [q, e] of Object.entries(j.entities || {})) if (e.sitelinks?.enwiki) qids[q] = e.sitelinks.enwiki.title;
}
console.log(Object.keys(qids).length, 'of', qidList.length, 'QIDs have English articles');

const entities = JSON.parse(readFileSync('public/data/entities.json', 'utf8'));
// Incremental: keep summaries already fetched (delete wiki.json to refresh them all).
const old = existsSync('public/data/wiki.json') ? JSON.parse(readFileSync('public/data/wiki.json', 'utf8')).pages : {};
// Period articles from eras.mjs (e.g. "New Kingdom of Egypt") are wanted too, when that file exists.
const eraFile = existsSync('public/data/eras.json') ? JSON.parse(readFileSync('public/data/eras.json', 'utf8')) : null;
const eraTitles = eraFile
  ? [...Object.values(eraFile.eras).flatMap((l) => l.map((e) => e[2])), ...Object.values(eraFile.history)].filter(Boolean)
  : [];
const wanted = [...new Set([...Object.values(entities).map((e) => e.title), ...Object.values(qids), ...eraTitles])];
const pages = Object.fromEntries(wanted.filter((t) => old[t]).map((t) => [t, old[t]]));
const titles = wanted.filter((t) => !old[t]).sort();
console.log(`${Object.keys(pages).length} summaries kept, ${titles.length} to fetch`);
for (let i = 0; i < titles.length; i += 20) {
  const j = await api('en.wikipedia.org', {
    action: 'query', prop: 'extracts|pageimages|info', exintro: 1, explaintext: 1, exsentences: 4, exlimit: 20,
    piprop: 'thumbnail', pithumbsize: 400, inprop: 'url', redirects: 1, titles: titles.slice(i, i + 20).join('|'),
  });
  for (const p of j.query?.pages || []) {
    if (p.missing || !p.extract) continue;
    pages[p.title] = { e: p.extract.trim(), t: p.thumbnail?.source, u: p.fullurl };
  }
  if (i % 400 === 0) console.log(`${i}/${titles.length}`);
}
writeFileSync('public/data/wiki.json', JSON.stringify({ qids, pages }));
console.log(`${Object.keys(pages).length} summaries for ${titles.length} titles`);
