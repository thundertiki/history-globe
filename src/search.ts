// Name search over public/data/search.json (built by pipeline/search.mjs). Works offline.
import { yearLabel, formatDate } from './dates';

/** [name, tier, key, from, to]: tier A has snapshot years (numbers), tier B has ISO days. */
export type Row = [string, 'A' | 'B', string, number | string, number | string];

export interface Result {
  name: string;
  tier: 'A' | 'B';
  key: string;
  /** parseDate()-able jump target: the first moment this name appears. */
  date: string;
  /** "1914–1918", "AD 800–AD 1000 (snapshots)" */
  span: string;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const isoYear = (iso: string) => Number(iso.slice(0, 4));
function isoLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return formatDate({ y, m, d });
}

function toResult([name, tier, key, from, to]: Row): Result {
  if (tier === 'A') {
    const a = Number(from), b = Number(to);
    return { name, tier, key, date: String(a), span: a === b ? `${yearLabel(a)} (snapshot)` : `${yearLabel(a)} – ${yearLabel(b)} (snapshots)` };
  }
  const f = String(from), t = String(to);
  return { name, tier, key, date: f, span: `${isoLabel(f)} – ${isoYear(t) >= 2019 ? 'now' : isoLabel(t)}` };
}

/** Best matches first: name starts with the query, then a word starts with it, then it appears inside. */
export function search(rows: Row[], query: string, limit = 12): Result[] {
  const q = fold(query.trim());
  if (!q) return [];
  const scored: { r: Row; s: number }[] = [];
  for (const r of rows) {
    const n = fold(r[0]);
    const i = n.indexOf(q);
    if (i < 0) continue;
    const s = i === 0 ? 0 : /[\s(\-]/.test(n[i - 1]) ? 1 : 2;
    scored.push({ r, s });
  }
  // Shorter names first within a rank (the plain "Germany" before "Germany (occupied)"), then earliest.
  scored.sort((a, b) => a.s - b.s || a.r[0].length - b.r[0].length || String(a.r[3]).localeCompare(String(b.r[3]), undefined, { numeric: true }));
  return scored.slice(0, limit).map((x) => toResult(x.r));
}
