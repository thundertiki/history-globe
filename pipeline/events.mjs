// Events layer: battles, sieges, treaties and the founding of large cities, from Wikidata (CC0), at build time.
// Only items with a date, coordinates and an English Wikipedia article are kept.
// Output: public/data/events.json = [[lon, lat, t, label, type, description, wikipediaTitle, dateText], ...]
// where t is a decimal astronomical year (1 BC = 0) for filtering by date.
import { writeFileSync } from 'node:fs';

const UA = 'history-globe-pipeline/0.1 (open-source educational map)';
const TYPES = {
  battle: { cls: 'wd:Q178561', date: 'P585|P580' },
  siege: { cls: 'wd:Q188055', date: 'P585|P580' },
  treaty: { cls: 'wd:Q131569 wd:Q625298', date: 'P585|P580|P577' },
  city: { cls: 'wd:Q515 wd:Q1549591 wd:Q1637706', date: 'P571', extra: '?e wdt:P1082 ?pop . FILTER(?pop > 1000000)' },
};

function queryFor(type, { cls, date, extra = '' }) {
  const unions = date
    .split('|')
    .map((p) => `{ ?e p:${p} ?st . ?st psv:${p} ?dv . }`)
    .join(' UNION ');
  return `SELECT ?e ?date ?prec ?cal ?coord ?label ?desc ?article WHERE {
    VALUES ?cls { ${cls} }
    ?e wdt:P31 ?cls .
    ${unions}
    ?dv wikibase:timeValue ?date ; wikibase:timePrecision ?prec ; wikibase:timeCalendarModel ?cal .
    ?e wdt:P625 ?coord .
    ${extra}
    ?article schema:about ?e ; schema:isPartOf <https://en.wikipedia.org/> .
    ?e rdfs:label ?label . FILTER(LANG(?label) = "en")
    OPTIONAL { ?e schema:description ?desc . FILTER(LANG(?desc) = "en") }
  }`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const JULIAN = 'http://www.wikidata.org/entity/Q1985786';
// The query service returns XSD dates: astronomical years (-1456 = 1457 BC) and always in the Gregorian
// calendar, even for items recorded in the Julian calendar. Convert those back so 1066 reads 14 Oct, not 20 Oct.
function parseTime(iso, prec, cal) {
  const m = iso.match(/^([+-]?)(\d+)-(\d\d)-(\d\d)/);
  if (!m) return null;
  let y = m[1] === '-' ? -Number(m[2]) : Number(m[2]);
  let mo = prec >= 10 ? Number(m[3]) : 0;
  let d = prec >= 11 && y > 0 ? Number(m[4]) : 0; // no day-exact dates shown before AD 1
  if (d && cal === JULIAN) {
    const t = new Date(Date.UTC(2000, mo - 1, d));
    t.setUTCFullYear(y);
    t.setUTCDate(t.getUTCDate() - (Math.floor(y / 100) - Math.floor(y / 400) - 2));
    [y, mo, d] = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
  }
  const t = y + (mo ? (mo - 1) / 12 + (d ? (d - 1) / 365 : 0) : 0);
  const yl = y <= 0 ? `${1 - y} BC` : y < 1000 ? `AD ${y}` : String(y);
  const text = d ? `${d} ${MONTHS[mo - 1]} ${yl}` : mo ? `${MONTHS[mo - 1]} ${yl}` : prec >= 9 ? yl : `c. ${yl}`;
  return { t: Math.round(t * 1000) / 1000, text };
}

const out = [];
const seen = new Set();
for (const [type, spec] of Object.entries(TYPES)) {
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(queryFor(type, spec));
  let j = null;
  for (let attempt = 0; attempt < 4 && !j; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
    if (res.ok) j = await res.json();
    else { console.log(type, 'HTTP', res.status, '- retrying'); await new Promise((r) => setTimeout(r, 10000 * (attempt + 1))); }
  }
  if (!j) { console.log(type, 'FAILED'); continue; }
  let n = 0;
  for (const b of j.results.bindings) {
    const id = b.e.value;
    if (seen.has(id)) continue;
    const c = b.coord.value.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/);
    const time = parseTime(b.date.value, Number(b.prec.value), b.cal?.value);
    if (!c || !time || Number(b.prec.value) < 7) continue;
    seen.add(id);
    const title = decodeURIComponent(b.article.value.replace('https://en.wikipedia.org/wiki/', '')).replace(/_/g, ' ');
    out.push([+(+c[1]).toFixed(3), +(+c[2]).toFixed(3), time.t, b.label.value, type, b.desc?.value ?? '', title, time.text]);
    n++;
  }
  console.log(type, n);
  await new Promise((r) => setTimeout(r, 3000));
}
out.sort((a, b) => a[2] - b[2]);
writeFileSync('public/data/events.json', JSON.stringify(out));
console.log('events:', out.length);
