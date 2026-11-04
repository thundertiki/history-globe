# history-globe: pick a date, see the world's borders on a 3D globe

Free, open-source (GPL-3.0) web app; private repo until Ben says to make it public. Phone version: a Claude
artifact built from the same code (`npm run build:artifact`, publish `dist-artifact/page.html` + its files).
Design and status: vault `10 Projects/History Globe.md`.

## Layout
- `src/`: Vite + TypeScript + MapLibre GL 5 (globe projection), no framework.
  - `dates.ts`: `HDate` with astronomical years (1 BC = 0). Never use JS `Date` before 1900.
  - `timeline.ts`: non-linear slider (years < 1500, months < 1886, days after).
  - `borders.ts`: picks the tier for a date. `globe.ts`: map and layers. `panel.ts`: tap card. `about.ts`: credits.
- `pipeline/` (run in this order): `fetch.sh` downloads into `raw/` (git-ignored); `build.mjs` simplifies to
  `public/data/borders/` (each file: `borders` + one-per-polity `labels`) and adds 1886+ period names;
  `entities.mjs` + `entities-search.mjs` map names to Wikipedia; `summaries.mjs` prebuilds `wiki.json`;
  `fonts.mjs` fetches label glyphs into `public/fonts/`; `artifact.mjs` packages the phone version.
- `public/data/` is generated, but committed so the site builds without running the pipeline.

## Data tiers (keep the About panel in sync)
- A: historical-basemaps (GPL-3.0), snapshots up to 1880, used before 1886-01-01.
- B: CShapes 2.0 (CC BY-NC-SA 4.0), 1886-01-01 to 2019-12-31, filtered by the `start`/`end` day.
- C: Natural Earth (public domain), from 2020 on, and the grey land base.

## Commands
- `npm test` (Vitest unit tests), `npm run dev`, `npm run build`.
- `node tests/e2e-check.mjs [shotDir]` runs headless Edge against the dev server on port 5174.
- Data: `npm run data:fetch`, `data:build`, `data:entities` and `data:summaries` (slow, rate-limited), `data:fonts`.

## Rules
- No runtime calls to other sites (the artifact blocks them): Wikipedia text and glyphs are prebuilt.
- Data licences: `public/data/LICENSES.md`. CShapes is non-commercial, so no ads or paid features.
- Say how precise the borders are wherever a date is shown.
- In flight: `docs/next.md`. Failed approaches: `docs/dead-ends.md`.
