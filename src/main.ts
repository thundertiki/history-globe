import './style.css';
import { Globe } from './globe';
import { Panel } from './panel';
import { initAbout } from './about';
import { HDate, formatDate, parseDate, yearLabel } from './dates';
import { SLIDER_MAX, posToDate, dateToPos, normalize, step } from './timeline';
import { Manifest, Pick, pickBorders } from './borders';
import { nameAt } from './names';

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

function precisionText(p: Pick): string {
  if (p.tier === 'A') return `Borders as of c. ${yearLabel(p.snapshotYear!)} (snapshot)`;
  if (p.tier === 'B') return 'Borders on this day';
  return 'Present-day borders';
}

async function main() {
  const [manifest, entities] = await Promise.all([
    fetch(`${DATA}/borders/index.json`).then((r) => r.json() as Promise<Manifest>),
    fetch(`${DATA}/entities.json`).then((r) => r.json()),
  ]);
  const globe = new Globe('map', DATA, new URL(`${import.meta.env.BASE_URL}fonts/`, location.href).href);
  const panel = new Panel(entities, (c, iso) => {
    const p = globe.ownerProps(c, iso);
    return p ? nameAt(p, iso) : undefined;
  }, DATA);
  initAbout();

  let date: HDate = parseDate(decodeURIComponent(location.hash.slice(1))) ?? { y: 1914, m: 7, d: 28 };
  date = normalize(date, today);
  let pick = pickBorders(date, manifest);
  let renderSeq = 0;

  async function render(fromSlider = false) {
    pick = pickBorders(date, manifest);
    input.value = formatDate(date);
    input.classList.remove('bad');
    precision.textContent = precisionText(pick);
    if (!fromSlider) slider.value = String(dateToPos(date, today));
    try {
      history.replaceState(null, "", `#${hashOf(date)}`); // shareable link to this date
    } catch {
      /* some embedded frames refuse history changes */
    }
    const seq = ++renderSeq;
    try {
      await globe.show(pick);
    } catch (e) {
      if (seq === renderSeq) showToast('Could not load borders for this date. Showing the previous map.');
      console.error(e);
    }
  }

  slider.max = String(SLIDER_MAX);
  slider.step = '1';
  slider.addEventListener('input', () => {
    date = posToDate(Number(slider.value), today);
    panel.hide();
    render(true);
  });
  $('prev').addEventListener('click', () => { date = step(date, -1, today); panel.hide(); render(); });
  $('next').addEventListener('click', () => { date = step(date, 1, today); panel.hide(); render(); });
  $('date-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const h = parseDate(input.value);
    if (!h) { input.classList.add('bad'); return; }
    date = normalize(h, today);
    panel.hide();
    render();
    input.blur();
  });
  input.addEventListener('focus', () => input.select());
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === input) return;
    if (e.key === 'ArrowLeft' && e.shiftKey) $('prev').click();
    if (e.key === 'ArrowRight' && e.shiftKey) $('next').click();
  });

  // Closing the card lets the map use the whole screen again.
  const releaseMap = () => globe.map.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 300 });
  $('panel-close').addEventListener('click', releaseMap);
  globe.onPick((place, at) => {
    if (!place) {
      panel.hide();
      return releaseMap();
    }
    // Once the card has its final size (summary loaded), move the map so the tapped country sits in the
    // open space above it.
    panel.show(place, pick).then(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById('panel')!;
        if (!el.hidden) globe.revealAbove(at, el.getBoundingClientRect());
      })
    );
  }, () => pick.tier);
  // Expose for debugging and automated checks.
  (window as any).hg = { globe, nameAt, pick: () => pick, setDate: (s: string) => { date = normalize(parseDate(s)!, today); return render(); } };
  render();
}

main().catch((e) => {
  console.error(e);
  showToast('Failed to start: ' + e.message);
});
