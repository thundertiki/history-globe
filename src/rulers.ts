// Who ruled and where the capital was on the chosen date, from public/data/rulers.json (pipeline/rulers.mjs).
import { yearLabel } from './dates';

/** [fromYear, toYear, name]; null = open on that side. */
export type Span = [number | null, number | null, string];
export interface RulerData {
  h?: Span[]; // head of state (or head of government when none is listed)
  c?: Span[]; // capital
}
export type Rulers = Record<string, RulerData>;

const covers = (s: Span, y: number) => (s[0] === null || s[0] <= y) && (s[1] === null || y <= s[1]);

/** Names whose span includes the year, shortest span first (the most specific entry), at most `max`. */
export function atYear(spans: Span[] | undefined, year: number, max = 2): Span[] {
  return (spans ?? [])
    .filter((s) => covers(s, year))
    .sort((a, b) => (a[1] ?? 1e9) - (a[0] ?? -1e9) - ((b[1] ?? 1e9) - (b[0] ?? -1e9)))
    .slice(0, max);
}

const range = (s: Span) =>
  s[0] === null && s[1] === null ? '' : ` (${s[0] === null ? '' : yearLabel(s[0])}–${s[1] === null ? 'now' : yearLabel(s[1])})`;

/** Card lines for a polity on a year; empty when nothing is known. Names are plain text (caller escapes). */
export function rulerLines(data: RulerData | undefined, year: number): { label: string; text: string }[] {
  if (!data) return [];
  const out: { label: string; text: string }[] = [];
  const h = atYear(data.h, year);
  if (h.length) out.push({ label: h.length > 1 ? 'Rulers' : 'Ruler', text: h.map((s) => s[2] + range(s)).join('; ') });
  const c = atYear(data.c, year);
  if (c.length) out.push({ label: 'Capital', text: c.map((s) => s[2] + (c.length > 1 ? range(s) : '')).join('; ') });
  return out;
}
