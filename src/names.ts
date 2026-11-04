// Period names for tier B features. The pipeline stores n0 (first name), then f1/n1, f2/n2...:
// name nk applies from ISO day fk onward.
import type { FeatureCollection } from 'geojson';

export const MAX_NAMES = 6;

/** The name a feature had on the given ISO day. */
export function nameAt(p: Record<string, any>, iso: string): string {
  let name = p.n0 ?? p.country_name;
  for (let k = 1; k < MAX_NAMES && p[`f${k}`]; k++) if (p[`f${k}`] <= iso) name = p[`n${k}`];
  return name;
}

/** All names a feature had, as [fromIso, name] pairs (first from its start). */
export function nameList(p: Record<string, any>): [string, string][] {
  const out: [string, string][] = [[p.start, p.n0 ?? p.country_name]];
  for (let k = 1; k < MAX_NAMES && p[`f${k}`]; k++) out.push([p[`f${k}`], p[`n${k}`]]);
  return out;
}

/**
 * Tier B label points for one day: only polities alive that day, named for that day, and one label per name
 * (the largest territory's), so neighbouring colonies that share a name such as "French West Africa" get one label.
 */
export function labelsOn(all: FeatureCollection, iso: string): FeatureCollection {
  const best = new Map<string, any>();
  for (const f of all.features) {
    const p = f.properties!;
    if (p.start > iso || p.end < iso) continue;
    const name = nameAt(p, iso);
    const cur = best.get(name);
    if (!cur || cur.properties.area < p.area) best.set(name, { ...f, properties: { ...p, _name: name } });
  }
  return { type: 'FeatureCollection', features: [...best.values()] };
}
