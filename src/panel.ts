// Info card for a tapped place: name at that date, what the dataset knows, and a live Wikipedia summary.
import type { Place } from './globe';
import { HDate, formatDate, yearLabel } from './dates';
import type { Pick } from './borders';

type Entities = Record<string, { title: string; qid: string | null }>;

const PRECISION = ['', 'precise', 'moderately precise', 'approximate'];
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const summaryCache = new Map<string, Promise<any>>();
function summary(title: string): Promise<any> {
  if (!summaryCache.has(title)) {
    summaryCache.set(
      title,
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );
  }
  return summaryCache.get(title)!;
}

async function titleFromQid(qid: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`
    );
    const j = await r.json();
    return j.entities?.[qid]?.sitelinks?.enwiki?.title ?? null;
  } catch {
    return null;
  }
}

export class Panel {
  private el = document.getElementById('panel')!;
  private body = document.getElementById('panel-body')!;
  private token = 0;

  constructor(private entities: Entities, private ownerName: (code: string, iso: string) => string | undefined) {
    document.getElementById('panel-close')!.addEventListener('click', () => this.hide());
  }

  hide() {
    this.el.hidden = true;
    this.token++;
  }

  async show(place: Place, date: HDate, pick: Pick) {
    const t = ++this.token;
    const meta: string[] = [];
    if (place.partOf) meta.push(`Part of ${esc(place.partOf)}`);
    if (place.status && place.status !== 'independent' && place.status !== 'N/A') {
      const owner = place.ownerCode && pick.iso ? this.ownerName(place.ownerCode, pick.iso) : undefined;
      meta.push(owner && owner !== place.name ? `${esc(place.status)} of ${esc(owner)}` : esc(place.status));
    }
    if (place.capital) meta.push(`Capital: ${esc(place.capital)}`);
    if (place.start && place.end)
      meta.push(`These borders: ${formatDate(iso(place.start))} – ${formatDate(iso(place.end))}`);
    if (pick.tier === 'A')
      meta.push(
        `Borders as of c. ${yearLabel(pick.snapshotYear!)} (snapshot)` +
          (place.precision ? `, ${PRECISION[place.precision]}` : '')
      );

    this.body.innerHTML = `
      <h2>${esc(place.name)}</h2>
      <div class="meta">${meta.map((m) => `<div>${m}</div>`).join('')}</div>
      <div id="wiki"><p class="src">Loading Wikipedia…</p></div>`;
    this.el.hidden = false;

    // Find a Wikipedia article: build-time mapping by name, else Natural Earth's QID.
    let title: string | null = this.entities[place.name]?.title ?? null;
    if (!title && place.qid) title = await titleFromQid(place.qid);
    const s = title ? await summary(title) : null;
    if (t !== this.token) return; // a newer tap replaced this one

    const wiki = document.getElementById('wiki')!;
    if (!s || s.type === 'disambiguation') {
      const q = encodeURIComponent(place.name);
      wiki.innerHTML = `<p class="src">No matching Wikipedia article yet.
        <a href="https://en.wikipedia.org/w/index.php?search=${q}" target="_blank" rel="noopener">Search Wikipedia</a></p>`;
      return;
    }
    const img = s.thumbnail?.source ? `<img src="${esc(s.thumbnail.source)}" alt="" loading="lazy">` : '';
    const link = s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title!)}`;
    wiki.innerHTML = `${img}<p>${esc(s.extract ?? '')}</p>
      <p class="src">From Wikipedia: <a href="${esc(link)}" target="_blank" rel="noopener">${esc(s.title)}</a>
      (CC BY-SA 4.0). Describes the entity overall, not only this date.</p>`;
  }
}

function iso(s: string): HDate {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}
