// Non-linear slider: years in the deep past, months from 1500, days from 1886 (when day-exact borders begin) to today.
// Each segment gets a fixed share of the slider track.
import { HDate, dayIndex, fromDayIndex } from './dates';

export const MIN_YEAR = -2999; // 3000 BC
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

export function segments(today: HDate): Segment[] {
  return [
    {
      f0: 0, f1: 0.35, count: MONTH_START - MIN_YEAR,
      toDate: (i) => ({ y: MIN_YEAR + i }),
      index: (h) => h.y - MIN_YEAR,
    },
    {
      f0: 0.35, f1: 0.6, count: (DAY_START - MONTH_START) * 12,
      toDate: (i) => ({ y: MONTH_START + Math.floor(i / 12), m: (i % 12) + 1 }),
      index: (h) => (h.y - MONTH_START) * 12 + ((h.m ?? 1) - 1),
    },
    {
      f0: 0.6, f1: 1, count: dayIndex(today) + 1,
      toDate: (i) => fromDayIndex(i),
      index: (h) => dayIndex(h),
    },
  ];
}

function segFor(h: HDate, segs: Segment[]): Segment {
  if (h.y < MONTH_START) return segs[0];
  if (h.y < DAY_START) return segs[1];
  return segs[2];
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
