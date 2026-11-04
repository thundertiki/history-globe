// Picks which border dataset (tier) and file covers a date, and the CShapes date filter.
import { HDate, isoDay, ordinal } from './dates';

export interface Manifest {
  tierA: { year: number; file: string }[];
  tierB: { start: string; end: string; file: string };
  tierC: { file: string };
}

export type Tier = 'A' | 'B' | 'C';

export interface Pick {
  tier: Tier;
  file: string;
  /** For tier A: the snapshot year actually shown. */
  snapshotYear?: number;
  /** For tier B: ISO day to filter features by start/end. */
  iso?: string;
  /** The chosen date's year (astronomical), for period-correct articles. */
  year: number;
}

const isoOrdinal = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return ordinal({ y, m, d });
};

export function pickBorders(h: HDate, man: Manifest): Pick {
  const o = ordinal(h);
  if (o < isoOrdinal(man.tierB.start)) {
    // Latest snapshot at or before the date; earliest one if the date predates them all.
    const slices = man.tierA;
    let s = slices[0];
    for (const x of slices) if (x.year <= h.y) s = x;
    return { tier: 'A', file: s.file, snapshotYear: s.year, year: h.y };
  }
  if (o <= isoOrdinal(man.tierB.end)) return { tier: 'B', file: man.tierB.file, iso: isoDay(h), year: h.y };
  return { tier: 'C', file: man.tierC.file, year: h.y };
}
