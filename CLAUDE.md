# history-globe: pick a date, see the world's borders on a 3D globe

Public, free, open-source (GPL-3.0) web app. Desktop first; the phone build comes later (keep the layout responsive).
Design and status: vault `10 Projects/History Globe.md`.

## Layout
- `src/`: Vite + TypeScript + MapLibre GL 5 (globe projection), no framework.
  - `dates.ts`: `HDate` with astronomical years (1 BC = 0). Never use JS `Date` before 1900.
  - `timeline.ts`: non-linear slider (years < 1500, months < 1886, days after).
  - `borders.ts`: picks the tier for a date. `globe.ts`: map and layers. `panel.ts`: tap card. `about.ts`: credits.
- `pipeline/`: `fetch.sh` downloads into `raw/` (git-ignored); `build.mjs` simplifies to `public/data/borders/`;
  `entities.mjs` maps names to Wikipedia/Wikidata (`entity-overrides.json` for fixes).
- `public/data/` is generated, but committed so the site builds without running the pipeline.

## Data tiers (keep the About panel in sync)
- A: historical-basemaps (GPL-3.0), snapshots up to 1880, used before 1886-01-01.
- B: CShapes 2.0 (CC BY-NC-SA 4.0), 1886-01-01 to 2019-12-31, filtered by the `start`/`end` day.
- C: Natural Earth (public domain), from 2020 on, and the grey land base.
- Non-commercial only (CShapes). No ads or paid features.

## Commands
- `npm test` (Vitest unit tests), `npm run dev`, `npm run build`.
- `node tests/e2e-check.mjs [shotDir]` runs headless Edge against the dev server on port 5174.
- Data: `npm run data:fetch`, `npm run data:build`, `npm run data:entities` (slow, rate-limited).

## Rules
- Wikidata/Wikipedia lookups happen in the pipeline; the client only calls the Wikipedia summary API and
  Wikidata `wbgetentities` for one QID on tap.
- Say how precise the borders are wherever a date is shown.
- In flight: `docs/next.md`. Failed approaches: `docs/dead-ends.md`.
