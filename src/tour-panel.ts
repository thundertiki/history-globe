// The tour view inside the sheet: the list of tours, a tour's sections, and one stop's text. It only draws;
// main.ts moves the map (applyStop) and decides when a tour ends.
import { formatDate, parseDate } from './dates';
import { stops, findStop, isSection, wikiUrl, type Tour, type TourIndexEntry, type Arrow, type Section, type Item } from './tours';

export interface TourCallbacks {
  /** Open a tour from the list. */
  open(id: string): void;
  /** Go to a stop (section intro or item): moves the map. */
  go(stopId: string): void;
}

const ICON: Record<string, string> = { battle: '⚔', event: '●', player: '◆', alliances: '⇄', text: '¶' };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(cls: string, text: string, onClick: () => void, label?: string): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

function paragraphs(text: string): HTMLElement[] {
  return text.split(/\n\s*\n/).map((p) => el('p', '', p.trim()));
}

function wikiLink(title: string): HTMLElement {
  const p = el('p', 'src');
  const a = el('a', '', 'Read more on Wikipedia');
  a.href = wikiUrl(title);
  a.target = '_blank';
  a.rel = 'noopener';
  p.append(a);
  return p;
}

export class TourPanel {
  private precisionEl: HTMLElement | null = null;

  constructor(private root: HTMLElement, private cb: TourCallbacks) {}

  /** The list of tours. */
  showIndex(list: TourIndexEntry[]) {
    const ul = el('ul', 'tour-list');
    for (const t of list) {
      const li = el('li');
      const b = button('tour-row', '', () => this.cb.open(t.id));
      b.append(el('span', 'tr-title', t.title), el('span', 'tr-meta', `${t.years} · ${t.items} stops`), el('span', 'tr-sum', t.summary));
      li.append(b);
      ul.append(li);
    }
    this.root.replaceChildren(el('h2', '', 'Tours'), ul);
    this.root.scrollTop = 0;
  }

  /** A tour's sections and their items; `current` is marked. */
  showTour(t: Tour, current?: string) {
    const out: HTMLElement[] = [this.header(t)];
    if (t.blocs?.length) out.push(this.legend(t));
    for (const s of t.sections) {
      const det = el('details', 'tour-sec');
      det.open = !current || s.id === current || s.items.some((i) => i.id === current);
      const sum = el('summary', '', s.title);
      det.append(sum);
      const ul = el('ul', 'tour-items');
      ul.append(this.row(s, current, 'Introduction'));
      for (const i of s.items) ul.append(this.row(i, current));
      det.append(ul);
      out.push(det);
    }
    this.root.replaceChildren(...out);
    this.precisionEl = null;
  }

  /** One stop: title, date and border precision, text, Wikipedia link, ◀ / ▶. */
  showStop(t: Tour, id: string, precision = '') {
    const found = findStop(t, id);
    if (!found) return this.showTour(t);
    const { stop, index } = found;
    const all = stops(t);
    const out: HTMLElement[] = [this.header(t)];
    out.push(button('ghost back', '◀ Sections', () => this.showTour(t, id)));
    const sec = isSection(stop);
    out.push(el('h3', '', sec ? stop.title : (stop as Item).title));
    const when = !sec && (stop as Item).when ? (stop as Item).when! : formatDate(parseDate(stop.date)!);
    const meta = el('div', 'meta');
    meta.append(el('div', '', sec ? when : `${ICON[(stop as Item).kind] ?? ''} ${when}`.trim()));
    this.precisionEl = el('div', 'prec', precision);
    meta.append(this.precisionEl);
    out.push(meta);
    if (stop.blocs && t.blocs?.length) out.push(this.legend(t));
    out.push(...paragraphs(sec ? (stop as Section).intro : (stop as Item).text));
    if (sec) {
      const ul = el('ul', 'tour-items');
      for (const i of (stop as Section).items) ul.append(this.row(i));
      out.push(ul);
    } else if ((stop as Item).wiki) out.push(wikiLink((stop as Item).wiki!));
    if (stop.arrows?.length) {
      const ul = el('ul', 'tour-items arrows');
      for (const aid of stop.arrows) {
        const a = t.arrows?.find((x) => x.id === aid);
        if (!a) continue;
        const li = el('li');
        li.append(button('tour-item', `⇄ ${a.label}`, () => this.showArrow(t, a, id)));
        ul.append(li);
      }
      out.push(ul);
    }
    const nav = el('div', 'tour-nav');
    const prev = button('ghost', '◀', () => this.cb.go(all[index - 1].id), 'Previous stop');
    const next = button('ghost', '▶', () => this.cb.go(all[index + 1].id), 'Next stop');
    prev.disabled = index === 0;
    next.disabled = index === all.length - 1;
    nav.append(prev, el('span', 'count', `${index + 1} / ${all.length}`), next);
    out.push(nav);
    this.root.replaceChildren(...out);
    this.root.scrollTop = 0;
  }

  /** Border precision arrives after the borders load. */
  setPrecision(text: string) {
    if (this.precisionEl) this.precisionEl.textContent = text;
  }

  /** A treaty line's text; Back returns to the stop it came from. */
  showArrow(t: Tour, a: Arrow, from?: string) {
    const out: HTMLElement[] = [this.header(t)];
    out.push(button('ghost back', '◀ Back', () => (from ? this.showStop(t, from) : this.showTour(t))));
    out.push(el('h3', '', a.label), ...paragraphs(a.text));
    if (a.wiki) out.push(wikiLink(a.wiki));
    this.root.replaceChildren(...out);
    this.precisionEl = null;
    this.root.scrollTop = 0;
  }

  private header(t: Tour): HTMLElement {
    // The sheet's own ✕ (#panel-close) ends the tour; main.ts handles it.
    return el('h2', 'tour-title', t.title);
  }

  private legend(t: Tour): HTMLElement {
    const ul = el('ul', 'tour-legend');
    for (const b of t.blocs!) {
      const li = el('li');
      const sw = el('span', 'sw');
      sw.style.background = b.color;
      li.append(sw, document.createTextNode(b.name));
      ul.append(li);
    }
    ul.append(el('li', 'neutral', 'Unshaded: neutral'));
    return ul;
  }

  private row(s: Section | Item, current?: string, label?: string): HTMLElement {
    const li = el('li');
    const icon = isSection(s) ? '§' : ICON[(s as Item).kind] ?? '';
    const b = button('tour-item', `${icon} ${label ?? (s as Item).title}`, () => this.cb.go(s.id));
    if (s.id === current) b.setAttribute('aria-current', 'true');
    li.append(b);
    return li;
  }
}
