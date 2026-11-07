// Which polities changed between two dates, so the map can briefly outline them.
import type { Feature, FeatureCollection } from 'geojson';
import type { Pick } from './borders';

/** Most polities worth outlining at once; more than this is a big jump, not "what changed". */
export const MAX_CHANGED = 12;
/** Tier B only: dates further apart than this are a jump, not a step. */
export const MAX_DAYS = 400;

/**
 * Features in `next` (shown for `to`) that were not there at `from`.
 * Tier B: alive on `to.iso` but not on `from.iso` (a border change makes a new feature with a new start day).
 * Tier A: names absent from the previous snapshot. Different tiers, or a jump over MAX_DAYS: nothing.
 */
export function changedFeatures(
  prev: FeatureCollection | null,
  from: Pick,
  next: FeatureCollection | null,
  to: Pick,
  days: number
): Feature[] {
  if (!prev || !next || from.tier !== to.tier || from.tier === 'C') return [];
  let out: Feature[];
  if (to.tier === 'B') {
    if (days > MAX_DAYS || from.iso === to.iso) return [];
    const [a, b] = [from.iso!, to.iso!];
    out = next.features.filter((f) => {
      const p = f.properties!;
      return p.start <= b && p.end >= b && !(p.start <= a && p.end >= a);
    });
  } else {
    if (prev === next || from.snapshotYear === to.snapshotYear) return [];
    const before = new Set(prev.features.map((f) => f.properties!.NAME));
    out = next.features.filter((f) => !before.has(f.properties!.NAME));
  }
  return out.length <= MAX_CHANGED ? out : [];
}
