// Turn pipeline/raw datasets into simplified TopoJSON under public/data/borders, plus a manifest.
// Run after fetch.sh:  node pipeline/build.mjs
import mapshaper from 'mapshaper';
import { readdirSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAW = 'pipeline/raw';
const OUT = 'public/data/borders';
for (const t of ['a', 'b', 'c']) mkdirSync(join(OUT, t), { recursive: true });

const ms = (cmd) => mapshaper.runCommands(cmd);
const kb = (f) => Math.round(statSync(f).size / 1024);

// historical-basemaps file label -> astronomical year ("bc1" = 1 BC = year 0)
const yearOf = (label) => (label.startsWith('bc') ? 1 - Number(label.slice(2)) : Number(label));

// Tier A: one file per snapshot. Only slices before CShapes starts (1886) are used.
const slices = readdirSync(join(RAW, 'hb'))
  .map((f) => f.match(/^world_(.+)\.geojson$/)?.[1])
  .filter(Boolean)
  .map((label) => ({ label, year: yearOf(label) }))
  .sort((a, b) => a.year - b.year);

for (const s of slices) {
  const out = join(OUT, 'a', `${s.label}.json`);
  await ms(
    `-i "${join(RAW, 'hb', `world_${s.label}.geojson`)}" name=borders ` +
      `-filter 'NAME != null && NAME !== ""' ` +
      `-filter-fields NAME,SUBJECTO,PARTOF,BORDERPRECISION ` +
      `-simplify 20% keep-shapes -o format=topojson quantization=1e5 "${out}"`
  );
  console.log('A', s.label, kb(out), 'KB');
}

// Tier B: CShapes 2.0, one file, filtered by date on the client.
{
  const out = join(OUT, 'b', 'cshapes.json');
  await ms(
    `-i "${join(RAW, 'cshapes_gw.topojson')}" -rename-layers borders ` +
      `-filter-fields gwcode,country_name,start,end,status,owner,capname ` +
      `-simplify 15% keep-shapes -o format=topojson quantization=1e5 "${out}"`
  );
  console.log('B cshapes', kb(out), 'KB');
}

// Tier C: Natural Earth admin-0 (present day).
{
  const out = join(OUT, 'c', 'ne.json');
  await ms(
    `-i "${join(RAW, 'ne_50m_admin0.geojson')}" name=borders ` +
      `-each 'name=NAME_LONG||NAME, qid=WIKIDATAID, sov=SOVEREIGNT' ` +
      `-filter-fields name,qid,sov ` +
      `-simplify 30% keep-shapes -o format=topojson quantization=1e5 "${out}"`
  );
  console.log('C ne', kb(out), 'KB');
}

const manifest = {
  // Tier boundaries as astronomical-year ISO-ish strings: A < 1886-01-01 <= B <= 2019-12-31 < C
  tierB: { start: '1886-01-01', end: '2019-12-31', file: 'b/cshapes.json' },
  tierC: { file: 'c/ne.json' },
  tierA: slices.filter((s) => s.year < 1886).map((s) => ({ year: s.year, file: `a/${s.label}.json` })),
};
writeFileSync(join(OUT, 'index.json'), JSON.stringify(manifest, null, 1));
console.log('manifest:', manifest.tierA.length, 'tier A slices');
