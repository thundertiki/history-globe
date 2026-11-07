import { describe, it, expect } from 'vitest';
import { parseDate, formatDate, yearLabel, isoDay, dayIndex, fromDayIndex } from '../src/dates';
import { posToDate, dateToPos, step, normalize, SLIDER_MAX, MIN_YEAR } from '../src/timeline';
import { pickBorders, Manifest } from '../src/borders';

const today = { y: 2026, m: 11, d: 3 };

describe('dates', () => {
  it('handles BCE with no year 0', () => {
    expect(parseDate('1 BC')).toEqual({ y: 0 });
    expect(parseDate('500 BC')).toEqual({ y: -499 });
    expect(yearLabel(0)).toBe('1 BC');
    expect(yearLabel(-499)).toBe('500 BC');
    expect(yearLabel(43)).toBe('AD 43');
    expect(yearLabel(-44999)).toBe('45,000 BC');
    expect(parseDate('45,000 BC')).toEqual({ y: -44999 });
  });
  it('parses and formats common forms', () => {
    expect(parseDate('1914')).toEqual({ y: 1914 });
    expect(parseDate('1914-07-28')).toEqual({ y: 1914, m: 7, d: 28 });
    expect(parseDate('28 July 1914')).toEqual({ y: 1914, m: 7, d: 28 });
    expect(parseDate('Jul 1914')).toEqual({ y: 1914, m: 7, d: undefined });
    expect(parseDate('1914-13-01')).toBeNull();
    expect(parseDate('nonsense')).toBeNull();
    expect(formatDate({ y: 1990, m: 10, d: 3 })).toBe('3 Oct 1990');
    expect(isoDay({ y: 1886 })).toBe('1886-01-01');
  });
  it('day index round-trips', () => {
    for (const i of [0, 1, 365, 36524, 45000]) expect(dayIndex(fromDayIndex(i))).toBe(i);
  });
});

describe('timeline', () => {
  it('ends are the range limits', () => {
    expect(posToDate(0, today)).toEqual({ y: MIN_YEAR });
    expect(posToDate(SLIDER_MAX, today)).toEqual(today);
  });
  it('precision grows toward the present', () => {
    expect(normalize({ y: 800, m: 5, d: 2 }, today)).toEqual({ y: 800 });
    expect(normalize({ y: 1700, m: 5, d: 2 }, today)).toEqual({ y: 1700, m: 5 });
    expect(normalize({ y: 1890, m: 10, d: 3 }, today)).toEqual({ y: 1890, m: 10, d: 3 });
    expect(normalize({ y: 1990, m: 10, d: 3 }, today)).toEqual({ y: 1990, m: 10, d: 3 });
  });
  it('round-trips every year, a sample of months and days', () => {
    for (let y = -2999; y < 1500; y += 7) expect(posToDate(dateToPos({ y }, today), today)).toEqual({ y });
    for (const y of [MIN_YEAR, -150999, -9999, -3099]) expect(posToDate(dateToPos({ y }, today), today)).toEqual({ y });
    for (let i = 0; i < 386 * 12; i += 13) {
      const h = { y: 1500 + Math.floor(i / 12), m: (i % 12) + 1 };
      expect(posToDate(dateToPos(h, today), today)).toEqual(h);
    }
    for (let i = 0; i <= dayIndex(today); i += 97) {
      const h = fromDayIndex(i);
      expect(posToDate(dateToPos(h, today), today)).toEqual(h);
    }
  });
  it('steps across segment boundaries', () => {
    expect(step({ y: 1499 }, 1, today)).toEqual({ y: 1500, m: 1 });
    expect(step({ y: 1500, m: 1 }, -1, today)).toEqual({ y: 1499 });
    expect(step({ y: 1885, m: 12 }, 1, today)).toEqual({ y: 1886, m: 1, d: 1 });
    expect(step({ y: 0 }, -1, today)).toEqual({ y: -1 });
    expect(step({ y: -2999 }, -1, today)).toEqual({ y: -3099 });
    expect(step({ y: -9999 }, -1, today)).toEqual({ y: -10999 });
    expect(normalize({ y: -45000 }, today)).toEqual({ y: -45999 });
    expect(step(today, 1, today)).toEqual(today);
  });
});

describe('borders', () => {
  const man: Manifest = {
    tierA: [
      { year: -2999, file: 'a/bc3000.json' },
      { year: -499, file: 'a/bc500.json' },
      { year: 1880, file: 'a/1880.json' },
    ],
    tierB: { start: '1886-01-01', end: '2019-12-31', file: 'b/cshapes.json' },
    tierC: { file: 'c/ne.json' },
  };
  it('picks tiers at the boundaries', () => {
    expect(pickBorders({ y: 1885, m: 12 }, man).tier).toBe('A');
    expect(pickBorders({ y: 1886, m: 1 }, man)).toMatchObject({ tier: 'B', iso: '1886-01-01' });
    expect(pickBorders({ y: 2019, m: 12, d: 31 }, man).tier).toBe('B');
    expect(pickBorders({ y: 2020, m: 1, d: 1 }, man).tier).toBe('C');
  });
  it('snaps tier A to the latest earlier snapshot', () => {
    expect(pickBorders({ y: -300 }, man)).toMatchObject({ file: 'a/bc500.json', snapshotYear: -499 });
    expect(pickBorders({ y: -499 }, man).file).toBe('a/bc500.json');
    expect(pickBorders({ y: -500 }, man).file).toBe('a/bc3000.json');
    expect(pickBorders({ y: -5000 }, man).file).toBe('a/bc3000.json');
  });
});

import { nameAt, nameList, labelsOn } from '../src/names';
describe('period names', () => {
  const p = { start: '1886-01-01', country_name: 'Germany (Prussia)', n0: 'Germany', f1: '1914-01-01', n1: 'German Empire' };
  it('picks the name in force on the day', () => {
    expect(nameAt(p, '1900-05-05')).toBe('Germany');
    expect(nameAt(p, '1914-01-01')).toBe('German Empire');
    expect(nameAt({ country_name: 'Mali' }, '1990-01-01')).toBe('Mali');
    expect(nameList(p)).toEqual([['1886-01-01', 'Germany'], ['1914-01-01', 'German Empire']]);
  });
  it('labels each name once per day, at the largest territory', () => {
    const pt = (props: any) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [0, 0] }, properties: props });
    const fc = { type: 'FeatureCollection' as const, features: [
      pt({ start: '1900-01-01', end: '1950-01-01', area: 5, n0: 'French West Africa', country_name: 'Senegal' }),
      pt({ start: '1900-01-01', end: '1950-01-01', area: 9, n0: 'French West Africa', country_name: 'Mali' }),
      pt({ start: '1960-01-01', end: '2019-12-31', area: 9, n0: 'Mali', country_name: 'Mali' }),
    ] };
    const l = labelsOn(fc, '1914-01-01');
    expect(l.features.length).toBe(1);
    expect(l.features[0].properties!.country_name).toBe('Mali');
    expect(labelsOn(fc, '1970-01-01').features.map((f) => f.properties!._name)).toEqual(['Mali']);
  });
});

import { search, Row } from '../src/search';
describe('search', () => {
  const rows: Row[] = [
    ['Roman Empire', 'A', 'Roman Empire', 0, 200],
    ['Holy Roman Empire', 'A', 'Holy Roman Empire', 1000, 1783],
    ['Germany', 'B', '255', '1886-01-01', '1945-05-07'],
    ['Côte d’Ivoire', 'B', '437', '1960-08-07', '2019-12-31'],
  ];
  it('ranks prefix before word-start and folds accents', () => {
    expect(search(rows, 'roman').map((r) => r.name)).toEqual(['Roman Empire', 'Holy Roman Empire']);
    expect(search(rows, 'cote')[0].name).toBe('Côte d’Ivoire');
  });
  it('gives the first date and a span', () => {
    const g = search(rows, 'germ')[0];
    expect(g.date).toBe('1886-01-01');
    expect(g.span).toContain('1945');
    expect(search(rows, 'cote')[0].span).toContain('now');
    expect(search(rows, 'roman')[0].date).toBe('0');
  });
});

import { changedFeatures } from '../src/changes';
describe('changedFeatures', () => {
  const f = (id: number, props: object) => ({ type: 'Feature' as const, id, geometry: null as any, properties: props });
  const fc = (...features: any[]) => ({ type: 'FeatureCollection' as const, features });
  const B = (iso: string) => ({ tier: 'B' as const, file: 'x', iso, year: 1990 });
  const all = fc(
    f(1, { gwcode: 265, start: '1949-10-07', end: '1990-10-02' }),
    f(2, { gwcode: 260, start: '1990-10-03', end: '2019-12-31' }),
    f(3, { gwcode: 220, start: '1886-01-01', end: '2019-12-31' })
  );
  it('tier B: features that start after the old day', () => {
    expect(changedFeatures(all, B('1990-10-02'), all, B('1990-10-03'), 1).map((x) => x.id)).toEqual([2]);
    expect(changedFeatures(all, B('1990-10-03'), all, B('1990-10-02'), 1).map((x) => x.id)).toEqual([1]);
  });
  it('ignores big jumps and different tiers', () => {
    expect(changedFeatures(all, B('1900-01-01'), all, B('1990-10-03'), 30000)).toEqual([]);
    expect(changedFeatures(all, { tier: 'A', file: 'a', year: 1800, snapshotYear: 1800 }, all, B('1990-10-03'), 1)).toEqual([]);
  });
  it('tier A: names new in the snapshot', () => {
    const A = (y: number) => ({ tier: 'A' as const, file: String(y), snapshotYear: y, year: y });
    const old = fc(f(1, { NAME: 'Rome' }));
    const nu = fc(f(1, { NAME: 'Rome' }), f(2, { NAME: 'Goths' }));
    expect(changedFeatures(old, A(100), nu, A(200), 100).map((x) => x.id)).toEqual([2]);
  });
});
