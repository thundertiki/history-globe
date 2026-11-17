// Guided tours: hand-written JSON in public/data/tours/. This module types, checks and indexes them; the panel is
// tour-panel.ts and main.ts applies each stop to the map.
import { parseDate, ordinal } from './dates';

export interface Camera { center: [number, number]; zoom: number; bearing?: number; pitch?: number }

/** What a stop does to the map. `blocs: true` shades the tour's blocs at `date`; `arrows` are ids from the tour. */
export interface MapState { date: string; camera: Camera; view?: 'flat'; highlight?: string[]; blocs?: boolean; arrows?: string[] }

export type ItemKind = 'event' | 'battle' | 'player' | 'alliances' | 'text';

/** `when` is the date as shown (e.g. "21 Feb – 18 Dec 1916"); `wiki` is a Wikipedia article title. */
export interface Item extends MapState { id: string; kind: ItemKind; title: string; when?: string; text: string; wiki?: string }

export interface Section extends MapState { id: string; title: string; intro: string; items: Item[] }

/** Members are polity refs (CShapes gwcode from 1886, snapshot NAME before) with `from` and an exclusive `to`. */
export interface Bloc { id: string; name: string; color: string; members: { ref: string; from: string; to?: string }[] }

export interface Arrow { id: string; from: [number, number]; to: [number, number]; label: string; text: string; wiki?: string }

export interface Tour { id: string; title: string; years: string; summary: string; blocs?: Bloc[]; arrows?: Arrow[]; sections: Section[] }

export interface TourIndexEntry { id: string; title: string; years: string; summary: string; items: number }

const KINDS: ItemKind[] = ['event', 'battle', 'player', 'alliances', 'text'];

const isLngLat = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n));

/** Problems with a tour file; empty when it is valid. Each message names the stop it is about. */
export function validateTour(raw: unknown): string[] {
  const t = raw as Partial<Tour>;
  const out: string[] = [];
  if (!t || typeof t !== 'object') return ['tour: not an object'];
  for (const k of ['id', 'title', 'years', 'summary'] as const) if (typeof t[k] !== 'string' || !t[k]) out.push(`tour: missing ${k}`);
  if (!Array.isArray(t.sections) || !t.sections.length) return [...out, 'tour: no sections'];
  const arrowIds = new Set((t.arrows ?? []).map((a) => a.id));
  for (const a of t.arrows ?? []) {
    if (!isLngLat(a.from) || !isLngLat(a.to)) out.push(`arrow ${a.id}: from/to must be [lng, lat]`);
    if (!a.label || !a.text) out.push(`arrow ${a.id}: missing label or text`);
  }
  for (const b of t.blocs ?? []) {
    if (!b.id || !b.name || !b.color || !Array.isArray(b.members)) out.push(`bloc ${b.id}: missing id, name, color or members`);
    for (const m of b.members ?? []) {
      if (!m.ref || !parseDate(m.from ?? '') || (m.to && !parseDate(m.to))) out.push(`bloc ${b.id}: bad member ${m.ref}`);
    }
  }
  const seen = new Set<string>();
  const checkState = (s: MapState & { id?: string }, what: string) => {
    const id = s.id ?? '?';
    if (seen.has(id)) out.push(`${what} ${id}: duplicate id`);
    seen.add(id);
    if (!parseDate(s.date ?? '')) out.push(`${what} ${id}: unreadable date "${s.date}"`);
    if (!s.camera || !isLngLat(s.camera.center) || !Number.isFinite(s.camera.zoom)) out.push(`${what} ${id}: bad camera`);
    if (s.view !== undefined && s.view !== 'flat') out.push(`${what} ${id}: view must be "flat"`);
    for (const a of s.arrows ?? []) if (!arrowIds.has(a)) out.push(`${what} ${id}: unknown arrow "${a}"`);
    if (s.blocs && !t.blocs?.length) out.push(`${what} ${id}: blocs: true but the tour has no blocs`);
  };
  for (const s of t.sections) {
    checkState(s, 'section');
    if (!s.title || !s.intro) out.push(`section ${s.id}: missing title or intro`);
    if (!Array.isArray(s.items)) { out.push(`section ${s.id}: items must be a list`); continue; }
    for (const i of s.items) {
      checkState(i, 'item');
      if (!i.title) out.push(`item ${i.id}: missing title`);
      if (!i.text) out.push(`item ${i.id}: missing text`);
      if (!KINDS.includes(i.kind)) out.push(`item ${i.id}: unknown kind "${i.kind}"`);
    }
  }
  return out;
}

/** Every stop in order: each section's intro, then its items. ◀ and ▶ walk this list. */
export function stops(t: Tour): (Section | Item)[] {
  return t.sections.flatMap((s) => [s, ...s.items]);
}

export function findStop(t: Tour, id: string): { stop: Section | Item; index: number } | undefined {
  const all = stops(t);
  const index = all.findIndex((s) => s.id === id);
  return index < 0 ? undefined : { stop: all[index], index };
}

export const isSection = (s: Section | Item): s is Section => 'items' in s;

/** Which bloc each polity ref belongs to on `date` (members active from `from`, until the day before `to`). */
export function blocsAt(blocs: Bloc[], date: string): Map<string, Bloc> {
  const day = ordinal(parseDate(date)!);
  const out = new Map<string, Bloc>();
  for (const b of blocs) {
    for (const m of b.members) {
      if (ordinal(parseDate(m.from)!) <= day && (!m.to || day < ordinal(parseDate(m.to)!))) out.set(m.ref, b);
    }
  }
  return out;
}

/** `#tour=<tour>/<item>` (the item is optional). Anything else is not a tour link. */
export function parseTourHash(hash: string): { tour: string; item?: string } | undefined {
  const m = hash.match(/^#?tour=([^/]+)(?:\/(.+))?$/);
  if (!m) return undefined;
  const tour = decodeURIComponent(m[1]);
  return m[2] ? { tour, item: decodeURIComponent(m[2]) } : { tour };
}

export function tourHash(tour: string, item?: string): string {
  return `#tour=${encodeURIComponent(tour)}${item ? `/${encodeURIComponent(item)}` : ''}`;
}

export function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURI(title.replace(/ /g, '_'))}`;
}
