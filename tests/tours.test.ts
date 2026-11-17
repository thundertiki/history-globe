import { describe, it, expect } from 'vitest';
import { validateTour, stops, findStop, blocsAt, parseTourHash, tourHash, wikiUrl, type Tour, type Bloc } from '../src/tours';

const cam = { center: [0, 45] as [number, number], zoom: 3 };
const item = (id: string, extra: Record<string, unknown> = {}) => ({ id, kind: 'text', title: id, date: '1914-07-28', camera: cam, text: 'x', ...extra });
const tour = (sections: any[], extra: Record<string, unknown> = {}) =>
  ({ id: 't', title: 'T', years: '1914', summary: 's', sections, ...extra }) as unknown as Tour;
const section = (id: string, items: any[]) => ({ id, title: id, intro: 'i', date: '1914', camera: cam, items });

describe('tours', () => {
  it('accepts a minimal valid tour', () => {
    expect(validateTour(tour([section('s1', [item('a')])]))).toEqual([]);
  });

  it('reports a missing text with the item id', () => {
    const p = validateTour(tour([section('s1', [{ ...item('noText'), text: undefined }])]));
    expect(p.some((m) => m.includes('noText'))).toBe(true);
  });

  it('reports an unreadable date with the item id', () => {
    const p = validateTour(tour([section('s1', [item('badDate', { date: '1914-13-40' })])]));
    expect(p.some((m) => m.includes('badDate'))).toBe(true);
  });

  it('reports duplicate ids across sections and items', () => {
    const p = validateTour(tour([section('dup', [item('dup')])]));
    expect(p.some((m) => m.includes('dup'))).toBe(true);
  });

  it('reports an unknown arrow id', () => {
    const p = validateTour(tour([section('s1', [item('arrowItem', { arrows: ['x'] })])]));
    expect(p.some((m) => m.includes('arrowItem'))).toBe(true);
  });

  it('reports blocs: true when the tour has no blocs', () => {
    const p = validateTour(tour([section('s1', [item('blocItem', { blocs: true })])]));
    expect(p.some((m) => m.includes('blocItem'))).toBe(true);
  });

  it('lists stops as each section intro then its items', () => {
    const t = tour([section('s1', [item('i1'), item('i2')]), section('s2', [item('i3'), item('i4')])]);
    expect(stops(t).map((s) => s.id)).toEqual(['s1', 'i1', 'i2', 's2', 'i3', 'i4']);
    expect(findStop(t, 'i3')?.index).toBe(4);
    expect(findStop(t, 'x')).toBeUndefined();
  });

  it('picks bloc members by date, with an exclusive end', () => {
    const blocs: Bloc[] = [
      { id: 'e', name: 'Entente', color: '#4a7bd0', members: [{ ref: '325', from: '1915-05-23' }, { ref: '365', from: '1914-08-01', to: '1918-03-03' }] },
    ];
    expect(blocsAt(blocs, '1915-05-22').has('325')).toBe(false);
    expect(blocsAt(blocs, '1915-05-23').get('325')?.id).toBe('e');
    expect(blocsAt(blocs, '1918-03-02').has('365')).toBe(true);
    expect(blocsAt(blocs, '1918-03-03').has('365')).toBe(false);
  });

  it('parses and writes tour links', () => {
    expect(parseTourHash('#tour=ww1/verdun')).toEqual({ tour: 'ww1', item: 'verdun' });
    expect(parseTourHash('#tour=ww1')).toEqual({ tour: 'ww1' });
    expect(parseTourHash('#1914-07-28/0,0,1')).toBeUndefined();
    expect(tourHash('ww1', 'verdun')).toBe('#tour=ww1/verdun');
  });

  it('builds direct Wikipedia article links', () => {
    expect(wikiUrl('Battle of Verdun')).toBe('https://en.wikipedia.org/wiki/Battle_of_Verdun');
  });
});
