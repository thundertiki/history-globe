// Last-resort matching for names entities.mjs could not resolve: Wikipedia full-text search, top hit only,
// accepted only if the hit's title starts like the name (guards against unrelated articles).
// Reads and rewrites public/data/entities.json and pipeline/unmatched.txt. Run after entities.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'history-globe-pipeline/0.1 (open-source educational map)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const core = (n) => n.replace(/\s*\([^)]*\)/g, '').split(/\s*\/\s*/)[0].trim();

const entities = JSON.parse(readFileSync('public/data/entities.json', 'utf8'));
const unmatched = readFileSync('pipeline/unmatched.txt', 'utf8').split('\n').filter((n) => n.trim());
const still = [];
let found = 0;
for (const name of unmatched) {
  const q = core(name);
  if (fold(q).length < 4) { still.push(name); continue; }
  const url = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&list=search&srlimit=1' +
    '&srprop=&srsearch=' + encodeURIComponent(q);
  let j = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.ok) { j = await res.json(); break; }
    await sleep(Number(res.headers.get('retry-after')) * 1000 || 5000 * 2 ** attempt);
  }
  await sleep(1000);
  const hit = j?.query?.search?.[0]?.title;
  if (hit && fold(hit).startsWith(fold(q).slice(0, 4)) && !/disambiguation/i.test(hit)) {
    entities[name] = { title: hit, qid: null };
    found++;
  } else still.push(name);
}
writeFileSync('public/data/entities.json', JSON.stringify(entities));
writeFileSync('pipeline/unmatched.txt', still.join('\n') + '\n');
console.log(`search pass: ${found} more matched, ${still.length} still unmatched`);
