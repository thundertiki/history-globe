// Non-linear slider: deep time in 1,000- then 100-year steps back to 300,000 BC (earliest Homo sapiens),
// single years from 3000 BC, months from 1500, days from 1886 (when day-exact borders begin) to today.
// Each segment gets a fixed share of the slider track.
import { HDate, dayIndex, fromDayIndex } from './dates';

export const MIN_YEAR = -299999; // 300,000 BC
export const YEAR_START = -2999; // 3000 BC: single-year steps from here
export const SLIDER_MAX = 1_000_000;
const MONTH_START = 1500;
const DAY_START = 1886; // CShapes day-exact borders start here

interface Segment {
  f0: number; // track fraction where the segment starts
  f1: number;
  count: number;
  toDate(i: number): HDate;
  index(h: HDate): number;
}

// Deep-time stops: every 1,000 years to 10,000 BC, then every 100 years to 3000 BC.
const DEEP: number[] = [];
for (let y = MIN_YEAR; y < -9999; y += 1000) DEEP.push(y);
for (let y = -9999; y < YEAR_START; y += 100) DEEP.push(y);

export function segments(today: HDate): Segment[] {
  return [
    {
      f0: 0, f1: 0.12, count: DEEP.length,
      toDate: (i) => ({ y: DEEP[i] }),
      index: (h) => {
        let i = 0;
        while (i + 1 < DEEP.length && DEEP[i + 1] <= h.y) i++;
        return i;
      },
    },
    {
      f0: 0.12, f1: 0.42, count: MONTH_START - YEAR_START,
      toDate: (i) => ({ y: YEAR_START + i }),
      index: (h) => h.y - YEAR_START,
    },
    {
      f0: 0.42, f1: 0.62, count: (DAY_START - MONTH_START) * 12,
      toDate: (i) => ({ y: MONTH_START + Math.floor(i / 12), m: (i % 12) + 1 }),
      index: (h) => (h.y - MONTH_START) * 12 + ((h.m ?? 1) - 1),
    },
    {
      f0: 0.62, f1: 1, count: dayIndex(today) + 1,
      toDate: (i) => fromDayIndex(i),
      index: (h) => dayIndex(h),
    },
  ];
}

function segFor(h: HDate, segs: Segment[]): Segment {
  if (h.y < YEAR_START) return segs[0];
  if (h.y < MONTH_START) return segs[1];
  if (h.y < DAY_START) return segs[2];
  return segs[3];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Slider position -> date at that segment's precision. */
export function posToDate(pos: number, today: HDate): HDate {
  const segs = segments(today);
  const f = clamp(pos, 0, SLIDER_MAX) / SLIDER_MAX;
  const s = segs.find((x) => f < x.f1) ?? segs[segs.length - 1];
  const i = clamp(Math.floor(((f - s.f0) / (s.f1 - s.f0)) * s.count), 0, s.count - 1);
  return s.toDate(i);
}

/** Date -> slider position. Snaps the date to its segment's precision and clamps to the range. */
export function dateToPos(h: HDate, today: HDate): number {
  const segs = segments(today);
  const s = segFor(h, segs);
  const i = clamp(s.index(h), 0, s.count - 1);
  // Middle of the bucket, so float rounding can't land in a neighbour. The very last date maps to the end.
  if (s === segs[segs.length - 1] && i === s.count - 1) return SLIDER_MAX;
  return Math.round((s.f0 + ((i + 0.5) / s.count) * (s.f1 - s.f0)) * SLIDER_MAX);
}

/** The date as the slider would show it (precision of its segment, clamped to range). */
export function normalize(h: HDate, today: HDate): HDate {
  return posToDate(dateToPos(h, today), today);
}

/** Move one unit (year, month or day, depending on the segment) forward or back. */
export function step(h: HDate, dir: 1 | -1, today: HDate): HDate {
  const segs = segments(today);
  const n = normalize(h, today);
  const s = segFor(n, segs);
  const i = s.index(n) + dir;
  if (i < 0) {
    const prev = segs[segs.indexOf(s) - 1];
    return prev ? prev.toDate(prev.count - 1) : n;
  }
  if (i >= s.count) {
    const next = segs[segs.indexOf(s) + 1];
    return next ? next.toDate(0) : n;
  }
  return s.toDate(i);
}

/** Era tabs: each narrows the slider to one stretch of history so a date is easier to find. */
export const ERAS = [
  { label: 'Prehistory', short: 'Pre', tiny: 'Pre', start: MIN_YEAR },
  { label: 'Ancient', short: 'Ancient', tiny: 'Anc.', start: YEAR_START },
  { label: 'Medieval', short: 'Medieval', tiny: 'Med.', start: 500 },
  { label: '1500–1800', short: '1500s', tiny: '1500s', start: 1500 },
  { label: '1800–1945', short: '1800s', tiny: '1800s', start: 1800 },
  { label: '1945–now', short: '1945+', tiny: '1945+', start: 1945 },
];

/** Index of the era a date falls in. */
export function eraOf(h: HDate): number {
  let i = 0;
  for (let k = 0; k < ERAS.length; k++) if (h.y >= ERAS[k].start) i = k;
  return i;
}

/** Slider track range [min, max] for an era; each era ends where the next begins. */
export function eraRange(i: number, today: HDate): [number, number] {
  const lo = i === 0 ? 0 : dateToPos({ y: ERAS[i].start }, today);
  const hi = i + 1 < ERAS.length ? dateToPos({ y: ERAS[i + 1].start }, today) - 1 : SLIDER_MAX;
  return [lo, hi];
}
