// Checks every tour file in public/data/tours/index.json against the border and event data (npm run check:tours).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateTour, stops, type Tour, type TourIndexEntry, type MapState } from '../src/tours';
import { pickBorders, type Manifest } from '../src/borders';
import { parseDate, isoDay } from '../src/dates';

const DATA = join(__dirname, '..', 'public', 'data');
const read = (f: string) => JSON.parse(readFileSync(join(DATA, f), 'utf-8'));
const index: TourIndexEntry[] = read('tours/index.json');
const manifest: Manifest = read('borders/index.json');
const cache = new Map<string, any[]>();
const props = (file: string) => {
  if (!cache.has(file)) cache.set(file, read(`borders/${file}`).objects.borders.geometries.map((g: any) => g.properties ?? {}));
  return cache.get(file)!;
};
const articles = new Set((read('events.json') as any[]).map((e) => e[6]));

/** Does polity `ref` exist on the map at `date`? Same keys as share links (main.ts placeKey). */
function exists(ref: string, date: string): boolean {
  const pick = pickBorders(parseDate(date)!, manifest);
  const all = props(pick.file);
  if (pick.tier === 'B') return all.some((p) => String(p.gwcode) === ref && p.start <= pick.iso! && p.end >= pick.iso!);
  if (pick.tier === 'A') return all.some((p) => p.NAME === ref);
  return all.some((p) => String(p.name ?? p.NAME ?? p.sov) === ref);
}

describe('tour data', () => {
  for (const entry of index) {
    it(`${entry.id}: file exists and is valid`, () => {
      const file = `tours/${entry.id}.json`;
      expect(existsSync(join(DATA, file)), `${file} is missing`).toBe(true);
      const t: Tour = read(file);
      expect(validateTour(t)).toEqual([]);
      expect(t.id).toBe(entry.id);
      expect(stops(t).length, 'index items count').toBe(entry.items);

      const missing: string[] = [];
      for (const s of stops(t) as (MapState & { id: string; kind?: string; wiki?: string })[]) {
        for (const ref of s.highlight ?? []) if (!exists(ref, s.date)) missing.push(`${s.id}: highlight ${ref} not on the map at ${s.date}`);
        if (s.blocs) {
          const day = isoDay(parseDate(s.date)!);
          for (const b of t.blocs ?? []) {
            for (const m of b.members) {
              const active = isoDay(parseDate(m.from)!) <= day && (!m.to || day < isoDay(parseDate(m.to)!));
              if (active && !exists(m.ref, s.date)) missing.push(`${s.id}: bloc ${b.id} member ${m.ref} not on the map at ${s.date}`);
            }
          }
        }
        if ((s.kind === 'battle' || s.kind === 'event') && s.wiki && !articles.has(s.wiki)) {
          console.warn(`${entry.id}/${s.id}: "${s.wiki}" is not an events.json article`);
        }
      }
      expect(missing).toEqual([]);
    });
  }
});
