// MapLibre globe: a present-day land base, plus swappable "borders" polygons and "labels" points for the date.
import maplibregl, { Map as MLMap, GeoJSONSource, FilterSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection, Feature } from 'geojson';
import type { Pick, Tier } from './borders';
import { labelsOn } from './names';

/** Common shape for a border feature, whatever dataset it came from. Raw props kept for date lookups. */
export interface Place {
  tier: Tier;
  props: Record<string, any>;
}

/** What a tap landed on: a country/polity, a dated event, or an early-human site. */
export type Hit =
  | { kind: 'place'; place: Place }
  | { kind: 'event'; props: Record<string, any> }
  | { kind: 'site'; props: Record<string, any> };

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

function colorKey(tier: Tier, p: Record<string, any>): string {
  if (tier === 'A') return p.SUBJECTO || p.NAME;
  if (tier === 'B') return String(p.status === 'independent' ? p.gwcode : p.owner ?? p.gwcode);
  return p.sov || p.name;
}

interface Layers {
  borders: FeatureCollection;
  labels: FeatureCollection;
}

const cache = new Map<string, Promise<Layers>>();

function load(url: string, tier: Tier): Promise<Layers> {
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return r.json() as Promise<Topology>;
      })
      .then((topo) => {
        const borders = feature(topo, topo.objects.borders) as unknown as FeatureCollection;
        const labels = feature(topo, topo.objects.labels) as unknown as FeatureCollection;
        borders.features.forEach((f: Feature, i) => {
          f.id = i;
          f.properties = { ...f.properties, _c: colorFor(colorKey(tier, f.properties || {})) };
        });
        // Tier A and C labels are already one per polity; tier B gets its names per day in show().
        for (const f of labels.features) f.properties = { ...f.properties, _name: f.properties?.NAME ?? f.properties?.name };
        return { borders, labels };
      });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url)!;
}


// Glyph ranges ship as base64 JSON (some hosts won't serve .pbf); this protocol decodes them for MapLibre.
let fontsBase = '';
maplibregl.addProtocol('hgfont', async (params) => {
  const [stack, range] = params.url.replace('hgfont://', '').split('/');
  const res = await fetch(`${fontsBase}${stack}/${range}.json`);
  if (!res.ok) throw new Error(`glyphs ${res.status}`);
  const bin = atob(await res.json());
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { data: data.buffer };
});

export class Globe {
  map: MLMap;
  private ready: Promise<void>;
  private shownFile = '';
  current: FeatureCollection | null = null;
  private shownLabels: FeatureCollection | null = null;

  constructor(container: string, private dataRoot: string, fontsUrl: string) {
    fontsBase = fontsUrl;
    this.map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        projection: { type: 'globe' },
        // Glyphs ship with the app (pipeline/fonts.mjs) so it works where other hosts are blocked.
        glyphs: 'hgfont://{fontstack}/{range}',
        sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
        sources: {},
        layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#16304d' } }],
      },
      center: [20, 30],
      zoom: 1.6,
      attributionControl: { compact: true },
    });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    this.ready = new Promise<void>((res) => this.map.on('load', () => res())).then(() => this.addBase());
  }

  private async addBase() {
    const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
    const land = await load(`${this.dataRoot}/borders/c/ne.json`, 'C');
    this.map.addSource('land', { type: 'geojson', data: land.borders });
    this.map.addLayer({ id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#3a3f45' } });
    this.map.addSource('borders', { type: 'geojson', data: empty });
    this.map.addSource('labels', { type: 'geojson', data: empty });
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
      id: 'labels', type: 'symbol', source: 'labels',
      layout: {
        'text-field': ['get', '_name'],
        'text-font': ['OpenSansSemibold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 5, 14],
        'text-max-width': 8,
        // When labels collide, larger territories keep theirs (lower sort key is placed first).
        'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'area'], 0]],
      },
      paint: { 'text-color': '#f4f1ea', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.2 },
    });

    // Overlays: early-human routes and sites (appear once their date is reached), then dated events.
    this.map.addSource('human-routes', { type: 'geojson', data: empty });
    this.map.addSource('human-sites', { type: 'geojson', data: empty });
    this.map.addSource('events', { type: 'geojson', data: empty });
    this.map.addLayer({
      id: 'human-routes', type: 'line', source: 'human-routes', filter: ['boolean', false],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': '#7fd1b9', 'line-width': 2.5, 'line-opacity': 0.85, 'line-dasharray': [2, 1.5] },
    });
    this.map.addLayer({
      id: 'human-sites', type: 'circle', source: 'human-sites', filter: ['boolean', false],
      paint: {
        'circle-radius': 6, 'circle-color': '#7fd1b9', 'circle-stroke-color': '#0b1320', 'circle-stroke-width': 2,
      },
    });
    this.map.addLayer({
      id: 'human-sites-label', type: 'symbol', source: 'human-sites', filter: ['boolean', false],
      layout: {
        'text-field': ['get', 'name'], 'text-font': ['OpenSansSemibold'], 'text-size': 11,
        'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true,
      },
      paint: { 'text-color': '#bff0e1', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1.2 },
    });
    this.map.addLayer({
      id: 'events', type: 'circle', source: 'events', filter: ['boolean', false],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 5, 6],
        'circle-color': ['match', ['get', 'type'], 'battle', '#e2574c', 'siege', '#f08a4b', 'treaty', '#e3b45c', '#6fb3ff'],
        'circle-stroke-color': '#0b1320', 'circle-stroke-width': 1.2,
      },
    });
    this.map.addLayer({
      id: 'events-label', type: 'symbol', source: 'events', minzoom: 4, filter: ['boolean', false],
      layout: {
        'text-field': ['get', 'label'], 'text-font': ['OpenSansSemibold'], 'text-size': 11,
        'text-offset': [0, 0.9], 'text-anchor': 'top', 'text-max-width': 10, 'text-optional': true,
      },
      paint: { 'text-color': '#ffe2c8', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1.2 },
    });
  }

  /** Load overlay data (events and the early-human layer) once. */
  async setOverlays(events: any[], human: { sites: any[]; routes: any[] }) {
    await this.ready;
    const pt = (lon: number, lat: number, props: object) =>
      ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props }) as Feature;
    (this.map.getSource('events') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: events.map(([lon, lat, t, label, type, desc, title, when]) => pt(lon, lat, { t, label, type, desc, title, when })),
    });
    (this.map.getSource('human-sites') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: human.sites.map((s) => pt(s.lon, s.lat, s)),
    });
    (this.map.getSource('human-routes') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: human.routes.map((r) => ({
        type: 'Feature', geometry: { type: 'LineString', coordinates: r.path }, properties: { t: r.t, label: r.label, when: r.when },
      })) as Feature[],
    });
  }

  /**
   * Show overlays for a decimal year: events within ±window years; early-human sites and routes from their date
   * on, while the date is before AD 1500 (after that they would only add clutter).
   */
  async updateOverlays(t: number, window: number, show: { events: boolean; human: boolean }) {
    await this.ready;
    const off: FilterSpecification = ['boolean', false];
    const ev: FilterSpecification = show.events ? ['all', ['>=', ['get', 't'], t - window], ['<=', ['get', 't'], t + window]] : off;
    const hu: FilterSpecification = show.human && t < 1500 ? ['<=', ['get', 't'], t] : off;
    this.map.setFilter('events', ev);
    this.map.setFilter('events-label', ev);
    for (const id of ['human-sites', 'human-sites-label', 'human-routes']) this.map.setFilter(id, hu);
  }

  /** Show the borders for a pick. Throws if the file fails to load (previous borders stay). */
  async show(pick: Pick): Promise<void> {
    await this.ready;
    const url = `${this.dataRoot}/borders/${pick.file}`;
    const layers = await load(url, pick.tier);
    if (this.shownFile !== url) {
      this.map.removeFeatureState({ source: 'borders' }); // ids repeat across files
      (this.map.getSource('borders') as GeoJSONSource).setData(layers.borders);
      this.shownFile = url;
      this.current = layers.borders;
    }
    const filter: FilterSpecification | null = pick.iso
      ? ['all', ['<=', ['get', 'start'], pick.iso], ['>=', ['get', 'end'], pick.iso]]
      : null;
    for (const id of ['borders-fill', 'borders-line']) this.map.setFilter(id, filter);
    const labels = pick.iso ? labelsOn(layers.labels, pick.iso) : layers.labels;
    if (labels !== this.shownLabels) {
      (this.map.getSource('labels') as GeoJSONSource).setData(labels);
      this.shownLabels = labels;
    }
  }

  /** Raw props of the CShapes polity with this gwcode that exists on the given day. */
  ownerProps(code: string, iso: string): Record<string, any> | undefined {
    return this.current?.features.find(
      (x) => String(x.properties?.gwcode) === code && x.properties?.start <= iso && x.properties?.end >= iso
    )?.properties ?? undefined;
  }

  /** Pan so a tapped spot is not hidden under the info card (phone sheet below, or desktop card at right). */
  revealAbove(at: { lngLat: maplibregl.LngLat; point: maplibregl.Point }, card: DOMRect) {
    const phone = card.width > window.innerWidth * 0.8;
    const hidden = phone ? at.point.y > card.top - 24 : at.point.x > card.left - 24 && at.point.y < card.bottom;
    if (!hidden) return;
    const padding = phone
      ? { top: 60, bottom: window.innerHeight - card.top + 12, left: 0, right: 0 }
      : { top: 0, bottom: 0, left: 0, right: window.innerWidth - card.left + 12 };
    this.map.easeTo({ center: at.lngLat, padding, duration: 500 });
  }

  /** Highlight one border feature (or none). */
  select(id: number | string | undefined) {
    if (this.selected !== undefined) this.map.setFeatureState({ source: 'borders', id: this.selected }, { sel: false });
    this.selected = id;
    if (id !== undefined) this.map.setFeatureState({ source: 'borders', id }, { sel: true });
  }
  private selected: number | string | undefined;

  /** Taps: an event or early-human site wins over the country underneath (with a finger-sized hit box). */
  onPick(cb: (hit: Hit | null, at: { lngLat: maplibregl.LngLat; point: maplibregl.Point }) => void, tierNow: () => Tier) {
    this.map.on('click', (e) => {
      const r = 12;
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]];
      const over = this.map.queryRenderedFeatures(box, { layers: ['human-sites', 'events'] })[0];
      const at = { lngLat: e.lngLat, point: e.point };
      if (over) {
        this.select(undefined);
        return cb({ kind: over.layer.id === 'events' ? 'event' : 'site', props: over.properties }, at);
      }
      const f = this.map.queryRenderedFeatures(e.point, { layers: ['borders-fill'] })[0];
      this.select(f?.id);
      cb(f ? { kind: 'place', place: { tier: tierNow(), props: f.properties } } : null, at);
    });
    for (const id of ['borders-fill', 'events', 'human-sites']) {
      this.map.on('mouseenter', id, () => (this.map.getCanvas().style.cursor = 'pointer'));
      this.map.on('mouseleave', id, () => (this.map.getCanvas().style.cursor = ''));
    }
  }
}
