import './style.css';
import maplibregl from 'maplibre-gl';
import { Globe, Hit } from './globe';
import { Panel } from './panel';
import { initAbout } from './about';
import { HDate, decimalYear, formatDate, ordinal, parseDate, yearLabel } from './dates';
import { SLIDER_MAX, posToDate, dateToPos, normalize, step } from './timeline';
import { Manifest, Pick, pickBorders } from './borders';
import { nameAt } from './names';
import { timelineFor } from './history';
import { Result, Row, search } from './search';
import { changedFeatures } from './changes';

const DATA = `${import.meta.env.BASE_URL}data`;
/** Share links always point at the public web app, whichever version (artifact, installer) made them. */
const SITE = 'https://thundertiki.github.io/history-globe/';
const now = new Date();
const today: HDate = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const slider = $<HTMLInputElement>('slider');
const input = $<HTMLInputElement>('date-input');
const precision = $('precision');
const toast = $('toast');

// Keep the info card above the date bar, whose height depends on the device's font size and safe area.
const timebar = document.querySelector<HTMLElement>('.timebar')!;
new ResizeObserver(() => {
  const r = timebar.getBoundingClientRect();
  document.documentElement.style.setProperty('--timebar-h', `${Math.ceil(window.innerHeight - r.top)}px`);
}).observe(timebar);

function showToast(msg: string) {
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => (toast.hidden = true), 4000);
}

function hashOf(h: HDate): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return h.d ? `${h.y}-${p(h.m!)}-${p(h.d)}` : h.m ? `${h.y}-${p(h.m)}` : String(h.y);
}

/** Link hash: `#<date>/<lng>,<lat>,<zoom>/<place>`; the last two parts are optional. */
function parseHash(hash: string) {
  const [d = '', cam = '', place = ''] = hash.replace(/^#/, '').split('/').map((x) => decodeURIComponent(x));
  const [lng, lat, zoom] = cam.split(',').map(Number);
  return {
    date: parseDate(d),
    cam: cam && [lng, lat, zoom].every(Number.isFinite) ? { center: [lng, lat] as [number, number], zoom } : undefined,
    place: place || undefined,
  };
}

/** The key a link uses for a polity: its name before 1886, its CShapes code to 2019, its name after. */
function placeKey(pl: { tier: string; props: Record<string, any> }): string {
  const p = pl.props;
  return String(pl.tier === 'A' ? p.NAME : pl.tier === 'B' ? p.gwcode : p.name ?? p.NAME ?? p.sov);
}

function precisionText(p: Pick, date: HDate): string {
  if (p.tier === 'A') {
    if (date.y < -9999) {
      const ago = Math.round((1950 - date.y) / 1000) * 1000;
      // Before the oldest snapshot the map is that snapshot (species ranges c. 125,000 years ago).
      const map = date.y < p.snapshotYear! ? ` · map from ${yearLabel(p.snapshotYear!)}` : '';
      return `c. ${ago.toLocaleString('en-US')} years ago · speculative${map}`;
    }
    return `Borders as of c. ${yearLabel(p.snapshotYear!)} (snapshot)`;
  }
  if (p.tier === 'B') return 'Borders on this day';
  return 'Present-day borders';
}

/** Events shown around the date: wide in the distant past (sparse, approximate), narrow near the present. */
const eventWindow = (h: HDate) => (h.y < 1500 ? 25 : h.y < 1886 ? 5 : 1);

// Layer toggles are a per-device preference.
const layers = { events: true, human: true };
try {
  Object.assign(layers, JSON.parse(localStorage.getItem('hg-layers') ?? '{}'));
} catch {
  /* storage unavailable */
}

async function main() {
  const json = (f: string) => fetch(`${DATA}/${f}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(f))));
  const [manifest, entities] = await Promise.all([json('borders/index.json') as Promise<Manifest>, json('entities.json')]);
  const globe = new Globe('map', DATA, new URL(`${import.meta.env.BASE_URL}fonts/`, location.href).href);
  const panel = new Panel(entities, (c, iso) => {
    const p = globe.ownerProps(c, iso);
    return p ? nameAt(p, iso) : undefined;
  }, DATA);
  initAbout();
  const searchRows: Promise<Row[]> = json('search.json').catch(() => []);

  // Secondary data loads after the first map is up.
  let presence: Record<string, number[]> = {};
  const extras = Promise.all([json('presence.json'), json('events.json'), json('human.json')])
    .then(([p, ev, hu]) => {
      presence = p;
      return globe.setOverlays(ev, hu);
    })
    .catch((e) => console.error('overlays', e));

  const link = parseHash(location.hash);
  if (link.cam) globe.map.jumpTo(link.cam);
  let date: HDate = link.date ?? { y: 1914, m: 7, d: 28 };
  date = normalize(date, today);
  let pick = pickBorders(date, manifest);
  let renderSeq = 0;
  let shown: Hit | null = null; // what the card shows, for timeline jumps and links

  let prevView: { date: HDate; pick: Pick; features: any } | null = null; // what was on the map before this render

  /** `flash`: outline the polities that changed since the previous date (stepping, not dragging or playing). */
  async function render(fromSlider = false, flash = false) {
    const before = prevView;
    pick = pickBorders(date, manifest);
    input.value = formatDate(date);
    input.classList.remove('bad');
    precision.textContent = precisionText(pick, date);
    if (!fromSlider) slider.value = String(dateToPos(date, today));
    writeHash();
    const seq = ++renderSeq;
    extras.then(() => globe.updateOverlays(decimalYear(date), eventWindow(date), layers));
    // Say so when a border file takes a moment (the first 1886–2019 load is about 0.8 MB).
    const slow = setTimeout(() => seq === renderSeq && (precision.textContent += ' · loading…'), 300);
    try {
      await globe.show(pick);
      if (seq === renderSeq) {
        precision.textContent = precisionText(pick, date);
        prevView = { date, pick, features: globe.current };
        if (flash && before) {
          const days = Math.abs(ordinal(date) - ordinal(before.date));
          const ch = changedFeatures(before.features, before.pick, globe.current, pick, days);
          if (ch.length) {
            globe.flash(ch.map((f) => f.id!));
            const names = [...new Set(ch.map((f) => (pick.tier === 'B' ? nameAt(f.properties!, pick.iso!) : f.properties!.NAME)))];
            showToast('Changed: ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3} more` : ''));
          }
        }
      }
    } catch (e) {
      if (seq === renderSeq) showToast('Could not load borders for this date. Showing the previous map.');
      console.error(e);
    } finally {
      clearTimeout(slow);
    }
  }

  /** Keep the address a shareable link to this view: date, camera and the open polity card. */
  function writeHash(): string {
    const c = globe.map.getCenter();
    let h = `#${hashOf(date)}/${c.lng.toFixed(2)},${c.lat.toFixed(2)},${globe.map.getZoom().toFixed(1)}`;
    if (shown?.kind === 'place' && !$('panel').hidden) h += `/${encodeURIComponent(placeKey(shown.place))}`;
    try {
      history.replaceState(null, '', h);
    } catch {
      /* some embedded frames refuse history changes */
    }
    return h;
  }
  globe.map.on('moveend', () => writeHash());

  /** The feature for a link or timeline key in the borders now shown. */
  function findPlace(key: string) {
    const iso = pick.iso;
    return globe.current?.features.find((x) => {
      const p = x.properties!;
      if (pick.tier === 'B') return String(p.gwcode) === key && p.start <= iso! && p.end >= iso!;
      return placeKey({ tier: pick.tier, props: p }) === key;
    });
  }

  $('share-btn').addEventListener('click', async () => {
    const url = SITE + writeHash();
    const title = `History Globe · ${formatDate(date)}`;
    try {
      if (navigator.share) return await navigator.share({ title, url });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch {
      showToast(url); // copying blocked (some embedded frames): show it to copy by hand
    }
  });

  // ---- Changing the date by hand stops playback and closes the card ----
  const setDate = (h: HDate, fromSlider = false, flash = false) => {
    date = h;
    panel.hide();
    globe.select(undefined);
    return render(fromSlider, flash);
  };
  slider.max = String(SLIDER_MAX);
  slider.step = '1';
  slider.addEventListener('input', () => {
    stopPlay();
    setDate(posToDate(Number(slider.value), today), true);
  });
  $('prev').addEventListener('click', () => { stopPlay(); setDate(step(date, -1, today), false, true); });
  $('next').addEventListener('click', () => { stopPlay(); setDate(step(date, 1, today), false, true); });
  $('date-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const h = parseDate(input.value);
    if (!h) { input.classList.add('bad'); return; }
    stopPlay();
    setDate(normalize(h, today), false, true);
    input.blur();
  });
  input.addEventListener('focus', () => input.select());
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === input) return;
    if (e.key === 'ArrowLeft' && e.shiftKey) $('prev').click();
    if (e.key === 'ArrowRight' && e.shiftKey) $('next').click();
    if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); $('play').click(); }
  });

  // ---- Play through time: moves the slider at a steady pace, so deep time and recent decades both pass ----
  const SPEEDS = [1, 3, 10];
  let speed = 0;
  let playing = false;
  let last = 0;
  let lastRender = 0;
  let pos = 0;
  const playBtn = $('play');
  function stopPlay() {
    if (!playing) return;
    playing = false;
    playBtn.textContent = '▶';
    playBtn.setAttribute('aria-label', 'Play through time');
  }
  function frame(ts: number) {
    if (!playing) return;
    const dt = last ? Math.min(ts - last, 100) : 0;
    last = ts;
    // 1× crosses the whole track in about 4 minutes.
    pos = Math.min(SLIDER_MAX, pos + (SLIDER_MAX / 240000) * SPEEDS[speed] * dt);
    if (ts - lastRender > 120 || pos >= SLIDER_MAX) {
      lastRender = ts;
      slider.value = String(Math.round(pos));
      const h = posToDate(Math.round(pos), today);
      if (hashOf(h) !== hashOf(date)) { date = h; render(true); }
    }
    if (pos >= SLIDER_MAX) return stopPlay();
    requestAnimationFrame(frame);
  }
  playBtn.addEventListener('click', () => {
    if (playing) return stopPlay();
    panel.hide();
    globe.select(undefined);
    pos = Number(slider.value) >= SLIDER_MAX ? 0 : Number(slider.value);
    playing = true;
    last = 0;
    playBtn.textContent = '❚❚';
    playBtn.setAttribute('aria-label', 'Pause');
    requestAnimationFrame(frame);
  });
  $('speed').addEventListener('click', () => {
    speed = (speed + 1) % SPEEDS.length;
    $('speed').textContent = `${SPEEDS[speed]}×`;
  });

  // ---- Layers menu ----
  const menu = $('layers');
  const ev = $<HTMLInputElement>('layer-events');
  const hu = $<HTMLInputElement>('layer-human');
  ev.checked = layers.events;
  hu.checked = layers.human;
  $('layers-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    $('layers-btn').setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target as Node)) menu.hidden = true;
  });
  for (const box of [ev, hu]) {
    box.addEventListener('change', () => {
      layers.events = ev.checked;
      layers.human = hu.checked;
      try { localStorage.setItem('hg-layers', JSON.stringify(layers)); } catch { /* storage unavailable */ }
      extras.then(() => globe.updateOverlays(decimalYear(date), eventWindow(date), layers));
    });
  }

  // ---- Search: find a polity by name and jump to when it existed ----
  const sBox = $('search');
  const sInput = $<HTMLInputElement>('search-input');
  const sList = $('search-results');
  const sBtn = $('search-btn');
  const setSearch = (open: boolean) => {
    sBox.hidden = !open;
    sBtn.setAttribute('aria-expanded', String(open));
    if (open) { menu.hidden = true; sInput.focus(); sInput.select(); }
  };
  sBtn.addEventListener('click', (e) => { e.stopPropagation(); setSearch(Boolean(sBox.hidden)); });
  document.addEventListener('click', (e) => {
    if (!sBox.hidden && !sBox.contains(e.target as Node)) setSearch(false);
  });
  sBox.addEventListener('keydown', (e) => { if (e.key === 'Escape') setSearch(false); });
  sInput.addEventListener('input', async () => {
    const found = search(await searchRows, sInput.value);
    sList.replaceChildren();
    if (!found.length && sInput.value.trim()) {
      const li = document.createElement('li');
      li.className = 'sr-empty';
      li.textContent = 'No match';
      sList.append(li);
    }
    for (const r of found) {
      const li = document.createElement('li');
      li.tabIndex = 0;
      li.setAttribute('role', 'option');
      li.innerHTML = '<span class="sr-name"></span><span class="sr-span"></span>';
      li.children[0].textContent = r.name;
      li.children[1].textContent = r.span;
      const go = () => { setSearch(false); goTo(r); };
      li.addEventListener('click', go);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      sList.append(li);
    }
  });
  sInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') (sList.firstElementChild as HTMLElement | null)?.click();
  });
  menu.addEventListener('click', () => setSearch(false));
  $('layers-btn').addEventListener('click', () => setSearch(false));

  /** Centre of the largest polygon (so Russia or France with far islands centre on the main land). */
  function centreOf(g: any): [number, number] | undefined {
    const polys: number[][][][] = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    let best: { a: number; c: [number, number] } | undefined;
    for (const poly of polys) {
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [x, y] of poly[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const a = (x1 - x0) * (y1 - y0);
      if (!best || a > best.a) best = { a, c: [(x0 + x1) / 2, (y0 + y1) / 2] };
    }
    return best?.c;
  }

  async function goTo(r: Result) {
    stopPlay();
    const h = parseDate(r.date);
    if (!h) return;
    date = normalize(h, today);
    panel.hide();
    globe.select(undefined);
    await render();
    const f = findPlace(r.key);
    if (!f) return showToast(`Could not find ${r.name} on the map for that date.`);
    globe.select(f.id);
    const c = centreOf(f.geometry);
    if (c) {
      globe.map.jumpTo({ center: c, zoom: Math.max(2.5, Math.min(globe.map.getZoom(), 4)), padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    }
    await showHit({ kind: 'place', place: { tier: pick.tier, props: f.properties! } });
    if (c) reveal({ lngLat: new maplibregl.LngLat(c[0], c[1]), point: globe.map.project(c) });
  }

  // ---- Taps ----
  const releaseMap = () => globe.map.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 300 });
  $('panel-close').addEventListener('click', () => { globe.select(undefined); releaseMap(); writeHash(); });
  const reveal = (at: Parameters<Globe['revealAbove']>[0]) =>
    requestAnimationFrame(() => {
      const el = $('panel');
      if (!el.hidden) globe.revealAbove(at, el.getBoundingClientRect());
    });
  const TYPE: Record<string, string> = { battle: 'Battle', siege: 'Siege', treaty: 'Treaty', city: 'City founded' };

  function showHit(hit: Hit) {
    shown = hit;
    return showCard(hit).finally(writeHash); // the link includes the polity once its card is open
  }
  function showCard(hit: Hit) {
    if (hit.kind === 'event') {
      const p = hit.props;
      return panel.showInfo(p.label, [`${TYPE[p.type] ?? 'Event'} · ${p.when}`], p.desc, p.title);
    }
    if (hit.kind === 'site') {
      const p = hit.props;
      return panel.showInfo(p.name, [p.when, 'Early human spread · approximate, some dates debated'], p.note, p.wiki);
    }
    return panel.show(hit.place, pick, timelineFor(hit.place, pick, presence, pick.tier === 'B' ? globe.current : null));
  }
  globe.onPick((hit, at) => {
    stopPlay();
    if (!hit) {
      panel.hide();
      writeHash();
      return releaseMap();
    }
    // Once the card has its final size (summary loaded), move the map so the tapped spot sits above it.
    showHit(hit).then(() => reveal(at));
  }, () => pick.tier);

  // Timeline chips: jump to that date and keep the same polity's card open.
  panel.onJump = async (d) => {
    const h = parseDate(d);
    if (!h || !shown || shown.kind !== 'place') return;
    const from = shown.place;
    date = normalize(h, today);
    await render(false, true);
    // Same polity across a tier change only by name (A) or code (B); otherwise close the card.
    const f = from.tier === pick.tier ? findPlace(placeKey(from)) : undefined;
    if (!f) return panel.hide();
    globe.select(f.id);
    showHit({ kind: 'place', place: { tier: pick.tier, props: f.properties! } });
  };

  // Expose for debugging and automated checks.
  (window as any).hg = {
    globe, goTo, search: async (q: string) => search(await searchRows, q), nameAt, pick: () => pick,
    setDate: (s: string) => setDate(normalize(parseDate(s)!, today)),
  };
  await render();
  // A shared link with a polity opens its card (the link already set the camera).
  const f = link.place ? findPlace(link.place) : undefined;
  if (f) {
    globe.select(f.id);
    showHit({ kind: 'place', place: { tier: pick.tier, props: f.properties! } });
  }
}

// Offline cache and "Install app" for the web version only: not in dev, the Claude artifact, the Electron
// app (app://, not a secure web origin) or the Android app (Capacitor injects window.Capacitor).
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' && 'serviceWorker' in navigator &&
    window.isSecureContext && location.protocol.startsWith('http') && !(window as any).Capacitor) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('service worker', e));
}

main().catch((e) => {
  console.error(e);
  showToast('Failed to start: ' + e.message);
});
