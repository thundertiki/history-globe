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
    for (let y = MIN_YEAR; y < 1500; y += 7) expect(posToDate(dateToPos({ y }, today), today)).toEqual({ y });
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
