// Info card for a tapped place: name at that date, what the dataset knows, and a live Wikipedia summary.
import type { Place } from './globe';
import { HDate, formatDate, yearLabel } from './dates';
import type { Pick } from './borders';
import { nameAt, nameList } from './names';
import type { Row } from './history';

type Entities = Record<string, { title: string; qid: string | null }>;

const PRECISION = ['', 'precise', 'moderately precise', 'approximate'];
const STATUS: Record<string, string> = {
  colony: 'Colony', occupied: 'Occupied', mandate: 'Mandate', protectorate: 'Protectorate',
};
const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const isoDate = (s: string): HDate => {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
};

interface Wiki {
  qids: Record<string, string>;
  pages: Record<string, { e: string; t?: string; u?: string }>;
}
// Summaries are fetched at build time (pipeline/summaries.mjs), so the app makes no calls to other sites.
let wiki: Promise<Wiki> | null = null;
function loadWiki(dataRoot: string): Promise<Wiki> {
  wiki ??= fetch(`${dataRoot}/wiki.json`)
    .then((r) => (r.ok ? r.json() : { qids: {}, pages: {} }))
    .catch(() => ((wiki = null), { qids: {}, pages: {} }));
  return wiki;
}

interface Eras {
  eras: Record<string, [number, string, string | null][]>;
  history: Record<string, string>;
}
let eras: Promise<Eras> | null = null;
function loadEras(dataRoot: string): Promise<Eras> {
  eras ??= fetch(`${dataRoot}/eras.json`)
    .then((r) => (r.ok ? r.json() : { eras: {}, history: {} }))
    .catch(() => ((eras = null), { eras: {}, history: {} }));
  return eras;
}

interface Card {
  name: string;
  meta: string[];
  lookups: string[]; // names to try against the entity table, best first
  qid?: string;
}

/** Turn a tapped feature into what the card shows. Exported for tests. */
export function describe(place: Place, pick: Pick, ownerName: (code: string, iso: string) => string | undefined): Card {
  const p = place.props;
  if (place.tier === 'A') {
    const meta: string[] = [];
    if (p.SUBJECTO && p.SUBJECTO !== p.NAME) meta.push(`Part of ${esc(p.SUBJECTO)}`);
    meta.push(
      `Borders as of c. ${yearLabel(pick.snapshotYear!)} (snapshot)` +
        (p.BORDERPRECISION ? `, ${PRECISION[p.BORDERPRECISION]}` : '')
    );
    return { name: p.NAME, meta, lookups: [p.NAME, p.SUBJECTO].filter(Boolean) };
  }
  if (place.tier === 'B') {
    const iso = pick.iso!;
    const name = nameAt(p, iso);
    const meta: string[] = [];
    const st = STATUS[p.status];
    if (st) {
      const owner = p.owner ? ownerName(String(p.owner), iso) : undefined;
      meta.push(owner && owner !== name ? `${st} of ${esc(owner)}` : st);
    }
    if (p.capname) meta.push(`Capital: ${esc(p.capname)}`);
    meta.push(`These borders: ${formatDate(isoDate(p.start))} – ${formatDate(isoDate(p.end))}`);
    const names = [...new Set(nameList(p).map(([, n]) => n))];
    if (names.length > 1) meta.push(`Also known in this period as: ${names.filter((n) => n !== name).map(esc).join(', ')}`);
    if (p.country_name !== name) meta.push(`Modern state: ${esc(p.country_name)}`);
    return { name, meta, lookups: [name, p.country_name] };
  }
  const meta: string[] = ['Present-day borders'];
  if (p.sov && p.sov !== p.name) meta.unshift(`Part of ${esc(p.sov)}`);
  return { name: p.name, meta, lookups: [p.name], qid: p.qid };
}

export class Panel {
  private el = document.getElementById('panel')!;
  private body = document.getElementById('panel-body')!;
  private token = 0;

  constructor(
    private entities: Entities,
    private ownerName: (code: string, iso: string) => string | undefined,
    private dataRoot: string
  ) {
    document.getElementById('panel-close')!.addEventListener('click', () => this.hide());
  }

  hide() {
    this.el.hidden = true;
    this.el.classList.remove('expanded');
    this.token++;
  }

  // Compact card: name, key facts and a 3-line summary beside a small thumbnail, so the map stays visible.
  // "More" expands the summary in place.
  /** Called with a date when a timeline chip is tapped. */
  onJump: (date: string) => void = () => {};

  async show(place: Place, pick: Pick, rows: Row[] = []) {
    const card = describe(place, pick, this.ownerName);
    // Old maps often just say "Egypt": use the period's article (New Kingdom, Mamluk Sultanate...) for the
    // chosen date, or "History of Egypt" before 1800 when no period is listed, never the modern country.
    if (place.tier !== 'C') {
      const [er, w] = await Promise.all([loadEras(this.dataRoot), loadWiki(this.dataRoot)]);
      const era = (er.eras[card.name] ?? []).filter(([from]) => from <= pick.year).pop();
      if (era?.[2]) {
        const meta = era[1] !== card.name ? [`Shown on the map as ${esc(card.name)}`, ...card.meta] : card.meta;
        return this.render(era[1], meta, rows, [], undefined, undefined, era[2]);
      }
      const title = card.lookups.map((n) => this.entities[n]?.title).find(Boolean);
      const modern = title && Object.values(w.qids).includes(title);
      if (modern && pick.year < 1800 && er.history[title!]) {
        return this.render(card.name, card.meta, rows, [], undefined, undefined, er.history[title!]);
      }
    }
    return this.render(card.name, card.meta, rows, card.lookups, card.qid);
  }

  /** Card for an event or an early-human site: its own text, plus Wikipedia when the summary was prebuilt. */
  async showInfo(name: string, meta: string[], text: string, wikiTitle?: string) {
    return this.render(name, meta, [], wikiTitle ? [wikiTitle] : [], undefined, text, wikiTitle);
  }

  private async render(
    name: string, meta: string[], rows: Row[], lookups: string[], qid?: string, text?: string, directTitle?: string
  ) {
    const t = ++this.token;
    this.el.classList.remove('expanded');
    const chips = rows.map((r) => `
      <div class="tl"><div class="tl-title">${esc(r.title)}</div><div class="chips">${r.chips
        .map((c) => `<button type="button" class="chip${c.current ? ' on' : ''}" data-date="${esc(c.date)}"
          ${c.current ? 'aria-current="true"' : ''}>${esc(c.label)}</button>`)
        .join('')}</div></div>`).join('');
    this.body.innerHTML = `
      <div class="head">
        <div class="titles">
          <h2>${esc(name)}</h2>
          <div class="meta">${meta.map((m) => `<div>${m}</div>`).join('')}</div>
        </div>
      </div>
      ${chips}
      <div id="wiki"><p class="src">Loading…</p></div>`;
    this.body.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) =>
      b.addEventListener('click', () => this.onJump(b.dataset.date!))
    );
    // Show the current chip in each row without the user scrolling sideways.
    this.body.querySelectorAll<HTMLElement>('.chip.on').forEach((c) => c.scrollIntoView({ block: 'nearest', inline: 'center' }));
    this.el.hidden = false;
    this.el.scrollTop = 0;

    // Wikipedia article: Natural Earth's QID first (exact), else the build-time name table, else a given title.
    const w = await loadWiki(this.dataRoot);
    let title: string | null = qid ? w.qids[qid] ?? null : null;
    for (const n of lookups) if (!title && this.entities[n]) title = this.entities[n].title;
    title ??= directTitle ?? null;
    const s = title ? w.pages[title] : undefined;
    if (t !== this.token) return; // a newer tap replaced this one

    const wiki = document.getElementById('wiki')!;
    if (text !== undefined && !s) {
      // Event or site without a prebuilt summary: its own text and a link.
      const href = directTitle
        ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(directTitle)}`
        : `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`;
      wiki.innerHTML = `${text ? `<p class="summary">${esc(text)}</p>` : ''}
        <p class="src"><a href="${href}" target="_blank" rel="noopener">Read more on Wikipedia</a></p>`;
      return;
    }
    if (!s) {
      const q = encodeURIComponent(name);
      wiki.innerHTML = `<p class="src">No matching Wikipedia article yet.
        <a href="https://en.wikipedia.org/w/index.php?search=${q}" target="_blank" rel="noopener">Search Wikipedia</a></p>`;
      return;
    }
    // Thumbnails come from Wikimedia; where that host is blocked (the artifact) the image is simply removed.
    if (s.t) {
      this.body.querySelector('.head')!.insertAdjacentHTML(
        'afterbegin',
        `<img class="thumb" src="${esc(s.t)}" alt="" loading="lazy" onerror="this.remove()">`
      );
    }
    const link = s.u ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title!.replace(/ /g, '_'))}`;
    wiki.innerHTML = `<p class="summary">${esc(s.e)}</p>
      <button type="button" class="more" aria-expanded="false">More</button>
      <p class="src">From Wikipedia: <a href="${esc(link)}" target="_blank" rel="noopener">${esc(title!)}</a>
      (CC BY-SA 4.0). Describes the entity overall, not only this date.</p>`;
    const more = wiki.querySelector<HTMLButtonElement>('.more')!;
    const summary = wiki.querySelector<HTMLElement>('.summary')!;
    // Hide "More" when the summary already fits in the clamped lines.
    requestAnimationFrame(() => {
      if (summary.scrollHeight <= summary.clientHeight + 2) more.hidden = true;
    });
    more.addEventListener('click', () => {
      const open = this.el.classList.toggle('expanded');
      more.textContent = open ? 'Less' : 'More';
      more.setAttribute('aria-expanded', String(open));
    });
  }
}
