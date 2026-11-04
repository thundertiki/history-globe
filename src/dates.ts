// Historical dates without JS Date for BCE. `y` is an astronomical year: 1 BC = 0, 2 BC = -1.
// `m` (1-12) and `d` (1-31) are set only when the date is known to that precision.
export interface HDate {
  y: number;
  m?: number;
  d?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Year label as people write it: "500 BC", "AD 43", "1914". */
export function yearLabel(y: number): string {
  if (y <= 0) return `${(1 - y).toLocaleString('en-US')} BC`; // 45,000 BC
  if (y < 1000) return `AD ${y}`;
  return String(y);
}

export function formatDate(h: HDate): string {
  const yl = yearLabel(h.y);
  if (h.m && h.d) return `${h.d} ${MONTHS[h.m - 1]} ${yl}`;
  if (h.m) return `${MONTHS[h.m - 1]} ${yl}`;
  return yl;
}

/** ISO-like "YYYY-MM-DD" for years 1..9999 (used against CShapes dates). Missing parts default to 01. */
export function isoDay(h: HDate): string {
  const p = (n: number, w: number) => String(n).padStart(w, '0');
  return `${p(h.y, 4)}-${p(h.m ?? 1, 2)}-${p(h.d ?? 1, 2)}`;
}

/** Decimal astronomical year, for comparing with event dates. */
export function decimalYear(h: HDate): number {
  return h.y + ((h.m ?? 1) - 1) / 12 + ((h.d ?? 1) - 1) / 365;
}

/** Sortable number: compare dates of mixed precision (missing parts count as 1). */
export function ordinal(h: HDate): number {
  return h.y * 10000 + (h.m ?? 1) * 100 + (h.d ?? 1);
}

/** Days since 1886-01-01 (start of day-exact borders) for Gregorian dates (safe to use Date here). */
export function dayIndex(h: HDate): number {
  return Math.round((Date.UTC(h.y, (h.m ?? 1) - 1, h.d ?? 1) - Date.UTC(1886, 0, 1)) / 86400000);
}

export function fromDayIndex(i: number): HDate {
  const t = new Date(Date.UTC(1886, 0, 1) + i * 86400000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Parse "500 BC", "-499", "1914", "1914-07-28", "28 Jul 1914", "Jul 1914". Returns null if unreadable. */
export function parseDate(text: string): HDate | null {
  const s = text.trim().replace(/\s+/g, ' ').replace(/(\d),(?=\d{3}\b)/g, '$1'); // "45,000 BC"
  let m = s.match(/^(\d+)\s*(BC|BCE)$/i);
  if (m) return { y: 1 - Number(m[1]) };
  m = s.match(/^(?:AD\s*)?(\d+)\s*(?:AD|CE)?$/i);
  if (m) return { y: Number(m[1]) };
  m = s.match(/^(-\d+)$/);
  if (m) return { y: Number(m[1]) };
  m = s.match(/^(\d{1,4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (m) return valid({ y: Number(m[1]), m: Number(m[2]), d: m[3] ? Number(m[3]) : undefined });
  m = s.match(/^(?:(\d{1,2}) )?([A-Za-z]{3})[a-z]* (\d{1,4})$/);
  if (m) {
    const mi = MONTHS.findIndex((x) => x.toLowerCase() === m![2].toLowerCase());
    if (mi < 0) return null;
    return valid({ y: Number(m[3]), m: mi + 1, d: m[1] ? Number(m[1]) : undefined });
  }
  return null;
}

function valid(h: HDate): HDate | null {
  if (h.m !== undefined && (h.m < 1 || h.m > 12)) return null;
  if (h.d !== undefined) {
    const dim = new Date(Date.UTC(2000, h.m!, 0)).getUTCDate(); // leap-safe upper bound
    if (h.d < 1 || h.d > dim) return null;
  }
  return h;
}
