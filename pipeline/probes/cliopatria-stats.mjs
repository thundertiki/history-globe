import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const fs = j.features;
console.log('features', fs.length, 'props', Object.keys(fs[0].properties));
const names = new Set(fs.map((f) => f.properties.Name));
console.log('distinct names', names.size, 'types', [...new Set(fs.map((f) => f.properties.Type))]);
const from = new Set();
for (const f of fs) from.add(f.properties.FromYear);
const years = [...from].sort((a, b) => a - b);
console.log('distinct FromYear', years.length, 'first', years.slice(0, 5), 'last', years.slice(-40));
for (const y of [-3000, -500, 1, 500, 1000, 1200, 1500, 1700, 1800, 1880, 1900, 1914, 1920, 1945, 1960, 1990, 2000, 2010, 2020, 2024]) {
  const alive = fs.filter((f) => f.properties.FromYear <= y && f.properties.ToYear >= y);
  console.log(y, alive.length, 'sample:', alive.slice(0, 4).map((f) => f.properties.Name).join('; '));
}
const modern = fs.filter((f) => f.properties.ToYear >= 1886);
const spans = modern.map((f) => f.properties.ToYear - f.properties.FromYear).sort((a, b) => a - b);
console.log('modern features', modern.length, 'median span', spans[spans.length >> 1]);
for (const n of ['Germany', 'Russia', 'Soviet', 'Yugoslavia', 'Austria']) {
  console.log(n, fs.filter((f) => f.properties.Name.includes(n) && f.properties.ToYear >= 1850).map((f) => `${f.properties.Name} ${f.properties.FromYear}-${f.properties.ToYear}`).slice(0, 12));
}
