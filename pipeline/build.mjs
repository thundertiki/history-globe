// Turn pipeline/raw datasets into simplified TopoJSON under public/data/borders, plus a manifest.
// Each output file has two objects: `borders` (polygons) and `labels` (one point per polity).
// Tier B also gets period names: CShapes uses modern names ("Russia (Soviet Union)" in 1914), so each CShapes
// feature is matched to the historical-basemaps snapshot polygon it falls in, per snapshot.
// Run after fetch.sh:  node pipeline/build.mjs
import mapshaper from 'mapshaper';
import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAW = 'pipeline/raw';
const OUT = 'public/data/borders';
for (const t of ['a', 'b', 'c']) mkdirSync(join(OUT, t), { recursive: true });
const kb = (f) => Math.round(statSync(f).size / 1024);
const read = (f) => readFileSync(f, 'utf8');

/** Run mapshaper in memory; returns the GeoJSON FeatureCollection it outputs. */
async function geo(cmd, inputs) {
  const out = await mapshaper.applyCommands(`${cmd} -o out.json format=geojson`, inputs);
  return JSON.parse(out['out.json']);
}

/** Simplify polygons and write one TopoJSON with `borders` and `labels` objects. */
async function writeTopo(file, borders, labels, pct) {
  const out = await mapshaper.applyCommands(
    `-i borders.json labels.json combine-files -simplify target=borders ${pct} keep-shapes ` +
      `-o out.json format=topojson quantization=1e5 target=*`,
    { 'borders.json': JSON.stringify(borders), 'labels.json': JSON.stringify(labels) }
  );
  // Some source names carry U+FFFD (broken encoding upstream); drop it.
  writeFileSync(file, String(out['out.json']).replace(/�/g, ''));
}

/** One label point per key: the inner point of the largest-area feature with that key. */
async function labelPoints(fc, keyOf, propsOf) {
  const pts = await geo('-i in.json -each "_area=this.area" -points inner', { 'in.json': JSON.stringify(fc) });
  const best = new Map();
  for (const p of pts.features) {
    const k = keyOf(p.properties);
    if (k == null || k === '') continue;
    if (!best.has(k) || best.get(k).properties._area < p.properties._area) best.set(k, p);
  }
  return {
    type: 'FeatureCollection',
    features: [...best.values()].map((p) => ({ type: 'Feature', geometry: p.geometry, properties: propsOf(p.properties) })),
  };
}

const yearOf = (label) => (label.startsWith('bc') ? 1 - Number(label.slice(2)) : Number(label));
const hbFile = (label) => join(RAW, 'hb', `world_${label}.geojson`);

// ---------- Tier A: historical-basemaps snapshots before 1886 ----------
const slices = readdirSync(join(RAW, 'hb'))
  .map((f) => f.match(/^world_(.+)\.geojson$/)?.[1])
  .filter(Boolean)
  .map((label) => ({ label, year: yearOf(label) }))
  .filter((s) => s.year < 1886)
  .sort((a, b) => a.year - b.year);

// presence: polity name -> snapshot years it appears in (the card's timeline for tier A).
const presence = {};
for (const s of slices) {
  const fc = await geo(
    `-i in.json -filter 'NAME != null && NAME !== ""' -filter-fields NAME,SUBJECTO,PARTOF,BORDERPRECISION`,
    { 'in.json': read(hbFile(s.label)) }
  );
  const labels = await labelPoints(fc, (p) => p.NAME, (p) => ({ NAME: p.NAME, area: Math.round(p._area / 1e6) }));
  const out = join(OUT, 'a', `${s.label}.json`);
  await writeTopo(out, fc, labels, '20%');
  for (const f of labels.features) (presence[f.properties.NAME] ??= []).push(s.year);
  console.log('A', s.label, kb(out), 'KB');
}
writeFileSync('public/data/presence.json', JSON.stringify(presence));

// ---------- Tier B: CShapes 2.0 with period names ----------
{
  const cs = await geo(
    `-i cs.json -filter-fields fid,gwcode,country_name,start,end,status,owner,capname -each "_area=this.area"`,
    { 'cs.json': read(join(RAW, 'cshapes_gw.topojson')) }
  );
  const byFid = new Map(cs.features.map((f) => [f.properties.fid, f.properties]));
  const pts = await geo('-i in.json -points inner', { 'in.json': JSON.stringify(cs) });

  // Snapshots that name tier B: the last one before 1886, then every later one.
  const NAME_YEARS = [1880, 1900, 1914, 1920, 1930, 1938, 1945, 1960, 1994, 2000, 2010];
  // The 1945 snapshot shows the post-war map, so it applies from the end of WWII.
  const START = { 1880: '1886-01-01', 1945: '1945-09-02' };
  const windowStart = (i) => START[NAME_YEARS[i]] ?? `${NAME_YEARS[i]}-01-01`;
  const windowEnd = (i) => (i + 1 < NAME_YEARS.length ? prevDay(windowStart(i + 1)) : '9999-12-31');
  const prevDay = (iso) => new Date(Date.parse(iso) - 86400000).toISOString().slice(0, 10);
  const ownerKey = (p) => (p.status === 'independent' ? String(p.gwcode) : String(p.owner));
  const base = (n) => n.replace(/\s*\(.*\)\s*$/, '').trim();

  // Fixes for naming errors in the snapshots, e.g. 1930 calls the whole USSR "White Russia".
  const renames = JSON.parse(read('pipeline/snapshot-renames.json'));
  const perWindow = new Map(); // fid -> [{ ws, name }] in snapshot order
  for (let i = 0; i < NAME_YEARS.length; i++) {
    const [ws, we] = [windowStart(i), windowEnd(i)];
    const joined = await geo('-i pts.json -join hb.json fields=NAME', {
      'pts.json': JSON.stringify(pts),
      'hb.json': read(hbFile(String(NAME_YEARS[i]))),
    });
    const fix = renames[NAME_YEARS[i]] ?? {};
    for (const f of joined.features) if (f.properties.NAME in fix) f.properties.NAME = fix[f.properties.NAME];
    // Features alive during this snapshot's window, grouped by the snapshot polygon they fall in.
    const groups = new Map();
    for (const f of joined.features) {
      const p = byFid.get(f.properties.fid);
      if (p.start > we || p.end < ws) continue;
      const hb = f.properties.NAME;
      if (!hb) continue;
      if (!groups.has(hb)) groups.set(hb, []);
      groups.get(hb).push(p);
    }
    for (const f of joined.features) {
      const p = byFid.get(f.properties.fid);
      if (p.start > we || p.end < ws) continue;
      let name = p.country_name;
      const hb = f.properties.NAME;
      if (hb) {
        // The snapshot polygon belongs to the largest feature in it; others share the name only if they are
        // territories of the same owner (e.g. colonies within "French West Africa"). This stops small states
        // like Luxembourg taking a neighbour's name where the snapshot's borders are coarser.
        const primary = groups.get(hb).reduce((a, b) => (b._area > a._area ? b : a));
        const sameRealm = ownerKey(p) === ownerKey(primary);
        const ownerName = p.status !== 'independent' ? byGw(p.owner, ws) : undefined;
        // An independent state never takes an occupation-style name like "Korea (USSR)".
        const occupied = p.status === 'independent' && /\(.+\)\s*$/.test(hb);
        if (sameRealm && !occupied && !(ownerName && base(hb) === base(ownerName))) name = hb;
      }
      if (!perWindow.has(p.fid)) perWindow.set(p.fid, []);
      perWindow.get(p.fid).push({ ws, name });
    }
  }

  // A feature that begins partway through a snapshot window usually marks a change the older snapshot
  // predates (Russia after the USSR, Germany after Versailles). Name its first stretch from the next
  // snapshot when the feature lives long enough to reach one.
  const names = new Map(); // fid -> [[fromIso, name], ...]
  for (const [fid, entries] of perWindow) {
    const p = byFid.get(fid);
    if (entries.length > 1 && entries[0].ws < p.start) entries.shift();
    const list = [];
    for (const { ws, name } of entries) {
      const from = p.start > ws ? p.start : ws;
      if (!list.length || list[list.length - 1][1] !== name) list.push([list.length ? from : p.start, name]);
    }
    names.set(fid, list);
  }

  function byGw(code, iso) {
    for (const p of byFid.values())
      if (String(p.gwcode) === String(code) && p.start <= iso && p.end >= iso) return p.country_name;
    return undefined;
  }

  // n0 = first name, then f1/n1, f2/n2...: name nk applies from date fk (MapLibre picks by the current date).
  const nameProps = (fid, fallback) => {
    const list = names.get(fid) ?? [['0000-01-01', fallback]];
    const o = { n0: list[0][1] };
    list.slice(1).forEach(([from, n], k) => Object.assign(o, { [`f${k + 1}`]: from, [`n${k + 1}`]: n }));
    return o;
  };
  for (const f of cs.features) {
    const p = f.properties;
    delete p._area;
    Object.assign(p, nameProps(p.fid, p.country_name));
  }
  const labels = await labelPoints(
    cs,
    (p) => p.fid,
    (p) => ({ fid: p.fid, start: p.start, end: p.end, area: Math.round(p._area / 1e6), ...nameProps(p.fid, p.country_name) })
  );
  const out = join(OUT, 'b', 'cshapes.json');
  await writeTopo(out, cs, labels, '15%');
  const maxNames = Math.max(...[...names.values()].map((l) => l.length));
  console.log('B cshapes', kb(out), 'KB; up to', maxNames, 'names per feature');
  writeFileSync(
    'pipeline/period-names.txt',
    [...names.entries()]
      .map(([fid, l]) => `${byFid.get(fid).country_name} ${byFid.get(fid).start}..${byFid.get(fid).end}: ` +
        l.map(([d, n]) => `${d} ${n}`).join(' | '))
      .sort()
      .join('\n') + '\n'
  );
}

// ---------- Tier C: Natural Earth admin-0 (present day) ----------
{
  const fc = await geo(
    `-i in.json -each 'name=NAME_LONG||NAME, qid=WIKIDATAID, sov=SOVEREIGNT' -filter-fields name,qid,sov`,
    { 'in.json': read(join(RAW, 'ne_50m_admin0.geojson')) }
  );
  const labels = await labelPoints(fc, (p) => p.name, (p) => ({ name: p.name, area: Math.round(p._area / 1e6) }));
  const out = join(OUT, 'c', 'ne.json');
  await writeTopo(out, fc, labels, '30%');
  console.log('C ne', kb(out), 'KB');
}

const manifest = {
  tierB: { start: '1886-01-01', end: '2019-12-31', file: 'b/cshapes.json' },
  tierC: { file: 'c/ne.json' },
  tierA: slices.map((s) => ({ year: s.year, file: `a/${s.label}.json` })),
};
writeFileSync(join(OUT, 'index.json'), JSON.stringify(manifest, null, 1));
console.log('manifest:', manifest.tierA.length, 'tier A slices');
