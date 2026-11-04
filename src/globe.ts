// MapLibre globe: a present-day land base plus one swappable "borders" layer for the chosen date.
import maplibregl, { Map as MLMap, GeoJSONSource, FilterSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection, Feature } from 'geojson';
import type { Pick, Tier } from './borders';

/** Common shape for a border feature, whatever dataset it came from. */
export interface Place {
  name: string;
  tier: Tier;
  partOf?: string; // empire / sovereign it belongs to, if different
  status?: string; // CShapes: independent, colony, ...
  ownerCode?: string; // CShapes owner gwcode
  capital?: string;
  start?: string;
  end?: string;
  precision?: number; // historical-basemaps BORDERPRECISION 1..3
  qid?: string;
  colorKey: string;
}

/** Stable muted colour per polity: hue, saturation and lightness all vary, so neighbours rarely match. */
function colorFor(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h >>>= 0;
  const hue = h % 360;
  const sat = 30 + ((h >>> 9) % 25);
  const light = 42 + ((h >>> 17) % 20);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function toPlace(tier: Tier, p: Record<string, any>): Place {
  if (tier === 'A') {
    const partOf = p.SUBJECTO && p.SUBJECTO !== p.NAME ? p.SUBJECTO : undefined;
    return { name: p.NAME, tier, partOf, precision: p.BORDERPRECISION, colorKey: p.SUBJECTO || p.NAME };
  }
  if (tier === 'B') {
    return {
      name: p.country_name, tier, status: p.status, ownerCode: p.owner, capital: p.capname,
      start: p.start, end: p.end, colorKey: String(p.owner ?? p.gwcode),
    };
  }
  const partOf = p.sov && p.sov !== p.name ? p.sov : undefined;
  return { name: p.name, tier, partOf, qid: p.qid, colorKey: p.sov || p.name };
}

const cache = new Map<string, Promise<FeatureCollection>>();

function load(url: string, tier: Tier): Promise<FeatureCollection> {
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return r.json() as Promise<Topology>;
      })
      .then((topo) => {
        const fc = feature(topo, topo.objects.borders) as unknown as FeatureCollection;
        fc.features.forEach((f: Feature, i) => {
          const place = toPlace(tier, f.properties || {});
          f.id = i;
          f.properties = { ...f.properties, _place: JSON.stringify(place), _name: place.name, _c: colorFor(place.colorKey) };
        });
        return fc;
      });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url)!;
}

export class Globe {
  map: MLMap;
  private ready: Promise<void>;
  private shownFile = '';
  current: FeatureCollection | null = null;

  constructor(container: string, private dataRoot: string) {
    this.map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        projection: { type: 'globe' },
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
        sources: {},
        layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#16304d' } }],
      },
      center: [20, 30],
      zoom: 1.6,
      attributionControl: { compact: true },
    });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    this.ready = new Promise((res) => this.map.on('load', () => res()));
    this.ready.then(() => this.addBase());
  }

  private async addBase() {
    const land = await load(`${this.dataRoot}/borders/c/ne.json`, 'C');
    this.map.addSource('land', { type: 'geojson', data: land });
    this.map.addLayer({ id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#3a3f45' } });
    this.map.addSource('borders', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    this.map.addLayer({
      id: 'borders-fill', type: 'fill', source: 'borders',
      paint: {
        'fill-color': ['get', '_c'],
        'fill-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 0.95, 0.72],
      },
    });
    this.map.addLayer({
      id: 'borders-line', type: 'line', source: 'borders',
      paint: { 'line-color': '#10151c', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1.4] },
    });
    this.map.addLayer({
      id: 'borders-label', type: 'symbol', source: 'borders',
      layout: {
        'text-field': ['get', '_name'],
        'text-font': ['Open Sans Semibold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9, 5, 14],
        'text-max-width': 8,
      },
      paint: { 'text-color': '#f4f1ea', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.2 },
    });
  }

  /** Show the borders for a pick. Throws if the file fails to load (previous borders stay). */
  async show(pick: Pick): Promise<void> {
    await this.ready;
    const url = `${this.dataRoot}/borders/${pick.file}`;
    const fc = await load(url, pick.tier);
    if (this.shownFile !== url) {
      while (!this.map.getSource('borders')) await new Promise((r) => setTimeout(r, 50));
      this.map.removeFeatureState({ source: 'borders' }); // ids repeat across files
      (this.map.getSource('borders') as GeoJSONSource).setData(fc);
      this.shownFile = url;
      this.current = fc;
    }
    const filter: FilterSpecification | null = pick.iso
      ? ['all', ['<=', ['get', 'start'], pick.iso], ['>=', ['get', 'end'], pick.iso]]
      : null;
    for (const id of ['borders-fill', 'borders-line', 'borders-label']) this.map.setFilter(id, filter);
  }

  /** Name of the CShapes polity with this gwcode that exists on the given day. */
  ownerName(code: string, iso: string): string | undefined {
    const f = this.current?.features.find(
      (x) => String(x.properties?.gwcode) === code && x.properties?.start <= iso && x.properties?.end >= iso
    );
    return f?.properties?.country_name;
  }

  onPick(cb: (place: Place | null) => void) {
    let selected: number | string | undefined;
    this.map.on('click', (e) => {
      const f = this.map.queryRenderedFeatures(e.point, { layers: ['borders-fill'] })[0];
      if (selected !== undefined) this.map.setFeatureState({ source: 'borders', id: selected }, { sel: false });
      selected = f?.id;
      if (selected !== undefined) this.map.setFeatureState({ source: 'borders', id: selected }, { sel: true });
      cb(f ? (JSON.parse(f.properties._place) as Place) : null);
    });
    this.map.on('mouseenter', 'borders-fill', () => (this.map.getCanvas().style.cursor = 'pointer'));
    this.map.on('mouseleave', 'borders-fill', () => (this.map.getCanvas().style.cursor = ''));
  }
}
