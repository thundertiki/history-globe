// Turn dist-artifact/index.html (from `vite build --mode artifact`) into the Claude artifact's page:
// the artifact wraps the page in its own <html>/<head>/<body>, so only the title, links, styles, body
// content and scripts are kept. Writes dist-artifact/page.html and lists the files to publish.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIR = 'dist-artifact';
const html = readFileSync(join(DIR, 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = [...head.matchAll(/<(title|link|script|style)\b[\s\S]*?(?:<\/\1>|\/?>)/g)]
  .map((m) => m[0])
  .filter((t) => !t.includes('rel="icon"'));
const page = [
  ...keep,
  // Single dark look by design; full-height map inside the artifact's safe-area padding.
  '<style>:root{color-scheme:dark;background:#0b1320}html,body{height:100%;background:#0b1320}</style>',
  body.trim(),
].join('\n');
writeFileSync(join(DIR, 'page.html'), page + '\n');

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (!/^(index|page)\.html$/.test(f) || d !== DIR) files.push(relative(DIR, p).replace(/\/g, '/'));
  }
};
walk(DIR);
writeFileSync(join(DIR, 'files.json'), JSON.stringify(files, null, 1));
const total = files.reduce((n, f) => n + statSync(join(DIR, f)).size, 0);
console.log(`page.html + ${files.length} files, ${(total / 1e6).toFixed(1)} MB`);
