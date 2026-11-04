// A polity's own timeline for the info card: where else it appears on the map, as dates you can jump to.
import type { FeatureCollection } from 'geojson';
import type { Place } from './globe';
import type { Pick } from './borders';
import { formatDate, yearLabel } from './dates';
import { nameList } from './names';

export interface Chip {
  label: string;
  date: string; // parseDate()-able jump target
  current: boolean;
}
export interface Row {
  title: string;
  chips: Chip[];
}

const yearOf = (iso: string) => Number(iso.slice(0, 4));

/**
 * Tier A: the snapshots the name appears in. Tier B: the polity's names over time and the days its borders
 * changed (all CShapes features with the same country code). Tier C: nothing (present day only).
 */
export function timelineFor(
  place: Place,
  pick: Pick,
  presence: Record<string, number[]>,
  cshapes: FeatureCollection | null
): Row[] {
  const p = place.props;
  if (place.tier === 'A') {
    const years = presence[p.NAME] ?? [];
    if (years.length < 2) return [];
    return [{
      title: 'On the map',
      chips: years.map((y) => ({ label: yearLabel(y), date: String(y), current: y === pick.snapshotYear })),
    }];
  }
  if (place.tier !== 'B' || !cshapes) return [];
  const parts = cshapes.features
    .map((f) => f.properties!)
    .filter((q) => String(q.gwcode) === String(p.gwcode))
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  // Names: merge consecutive identical names across border changes into one run.
  const runs: { name: string; from: string; to: string }[] = [];
  for (const q of parts) {
    const list = nameList(q);
    list.forEach(([from, name], k) => {
      const to = k + 1 < list.length ? list[k + 1][0] : q.end;
      const last = runs[runs.length - 1];
      if (last && last.name === name) last.to = to;
      else runs.push({ name, from, to });
    });
  }
  const iso = pick.iso!;
  const rows: Row[] = [];
  if (runs.length > 1) {
    rows.push({
      title: 'Names',
      chips: runs.map((r) => ({
        label: `${r.name} ${yearOf(r.from)}–${yearOf(r.to) >= 2019 ? 'now' : yearOf(r.to)}`,
        date: r.from,
        current: r.from <= iso && iso <= r.to,
      })),
    });
  }
  if (parts.length > 1) {
    rows.push({
      title: `Border changes (${parts.length - 1})`,
      chips: parts.map((q) => {
        const [y, m, d] = q.start.split('-').map(Number);
        return { label: formatDate({ y, m, d }), date: q.start, current: q.start <= iso && iso <= q.end };
      }),
    });
  }
  return rows;
}
