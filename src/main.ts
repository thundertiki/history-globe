import './style.css';
import { Globe, Hit } from './globe';
import { Panel } from './panel';
import { initAbout } from './about';
import { HDate, decimalYear, formatDate, parseDate, yearLabel } from './dates';
import { SLIDER_MAX, posToDate, dateToPos, normalize, step } from './timeline';
import { Manifest, Pick, pickBorders } from './borders';
import { nameAt } from './names';
import { timelineFor } from './history';

const DATA = `${import.meta.env.BASE_URL}data`;
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

  // Secondary data loads after the first map is up.
  let presence: Record<string, number[]> = {};
  const extras = Promise.all([json('presence.json'), json('events.json'), json('human.json')])
    .then(([p, ev, hu]) => {
      presence = p;
      return globe.setOverlays(ev, hu);
    })
    .catch((e) => console.error('overlays', e));

  let date: HDate = parseDate(decodeURIComponent(location.hash.slice(1))) ?? { y: 1914, m: 7, d: 28 };
  date = normalize(date, today);
  let pick = pickBorders(date, manifest);
  let renderSeq = 0;

  async function render(fromSlider = false) {
    pick = pickBorders(date, manifest);
    input.value = formatDate(date);
    input.classList.remove('bad');
    precision.textContent = precisionText(pick, date);
    if (!fromSlider) slider.value = String(dateToPos(date, today));
    try {
      history.replaceState(null, '', `#${hashOf(date)}`); // shareable link to this date
    } catch {
      /* some embedded frames refuse history changes */
    }
    const seq = ++renderSeq;
    extras.then(() => globe.updateOverlays(decimalYear(date), eventWindow(date), layers));
    // Say so when a border file takes a moment (the first 1886–2019 load is about 0.8 MB).
    const slow = setTimeout(() => seq === renderSeq && (precision.textContent += ' · loading…'), 300);
    try {
      await globe.show(pick);
      if (seq === renderSeq) precision.textContent = precisionText(pick, date);
    } catch (e) {
      if (seq === renderSeq) showToast('Could not load borders for this date. Showing the previous map.');
      console.error(e);
    } finally {
      clearTimeout(slow);
    }
  }

  // ---- Changing the date by hand stops playback and closes the card ----
  const setDate = (h: HDate, fromSlider = false) => {
    date = h;
    panel.hide();
    globe.select(undefined);
    return render(fromSlider);
  };
  slider.max = String(SLIDER_MAX);
  slider.step = '1';
  slider.addEventListener('input', () => {
    stopPlay();
    setDate(posToDate(Number(slider.value), today), true);
  });
  $('prev').addEventListener('click', () => { stopPlay(); setDate(step(date, -1, today)); });
  $('next').addEventListener('click', () => { stopPlay(); setDate(step(date, 1, today)); });
  $('date-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const h = parseDate(input.value);
    if (!h) { input.classList.add('bad'); return; }
    stopPlay();
    setDate(normalize(h, today));
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

  // ---- Taps ----
  const releaseMap = () => globe.map.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 300 });
  $('panel-close').addEventListener('click', () => { globe.select(undefined); releaseMap(); });
  const reveal = (at: Parameters<Globe['revealAbove']>[0]) =>
    requestAnimationFrame(() => {
      const el = $('panel');
      if (!el.hidden) globe.revealAbove(at, el.getBoundingClientRect());
    });
  const TYPE: Record<string, string> = { battle: 'Battle', siege: 'Siege', treaty: 'Treaty', city: 'City founded' };

  let shown: Hit | null = null; // what the card shows, for timeline jumps
  function showHit(hit: Hit) {
    shown = hit;
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
      return releaseMap();
    }
    // Once the card has its final size (summary loaded), move the map so the tapped spot sits above it.
    showHit(hit).then(() => reveal(at));
  }, () => pick.tier);

  // Timeline chips: jump to that date and keep the same polity's card open.
  panel.onJump = async (d) => {
    const h = parseDate(d);
    if (!h || !shown || shown.kind !== 'place') return;
    const key = shown.place.props;
    date = normalize(h, today);
    await render();
    const iso = pick.iso;
    const f = globe.current?.features.find((x) => {
      const p = x.properties!;
      if (pick.tier === 'A') return p.NAME === key.NAME;
      if (pick.tier === 'B') return String(p.gwcode) === String(key.gwcode) && p.start <= iso! && p.end >= iso!;
      return false;
    });
    if (!f) return panel.hide();
    globe.select(f.id);
    showHit({ kind: 'place', place: { tier: pick.tier, props: f.properties! } });
  };

  // Expose for debugging and automated checks.
  (window as any).hg = {
    globe, nameAt, pick: () => pick,
    setDate: (s: string) => setDate(normalize(parseDate(s)!, today)),
  };
  render();
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
