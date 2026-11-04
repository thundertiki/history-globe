# history-globe: pick a date, see the world's borders on a 3D globe

Free, open-source (GPL-3.0) web app; private repo until Ben says to make it public. Phone version: a Claude
artifact built from the same code (`npm run build:artifact`, publish `dist-artifact/page.html` + its files).
Design and status: vault `10 Projects/History Globe.md`.

## Layout
- `src/`: Vite + TypeScript + MapLibre GL 5 (globe projection), no framework.
  - `dates.ts`: `HDate` with astronomical years (1 BC = 0). Never use JS `Date` before 1900.
  - `timeline.ts`: non-linear slider (deep time 1,000/100-year steps from 300,000 BC, years from 3000 BC, months
    from 1500, days from 1886).
  - `history.ts`: the card's timeline chips. Overlays (events, early humans) live in `globe.ts`.
  - `borders.ts`: picks the tier for a date. `globe.ts`: map and layers. `panel.ts`: tap card. `about.ts`: credits.
- `pipeline/` (run in this order): `fetch.sh` downloads into `raw/` (git-ignored); `build.mjs` simplifies to
  `public/data/borders/` (each file: `borders` + one-per-polity `labels`) and adds 1886+ period names;
  `entities.mjs` + `entities-search.mjs` map names to Wikipedia; `summaries.mjs` prebuilds `wiki.json`;
  `fonts.mjs` fetches label glyphs into `public/fonts/`; `events.mjs` pulls Wikidata events into `events.json`;
  `apply-overrides.mjs` applies `entity-overrides.json` and resolves new names; `eras.mjs` maps old-map names
  like "Egypt" to period articles by date (`pipeline/eras.json`, run before `summaries.mjs`); `artifact.mjs` packages the
  artifact. `public/data/human.json` (early human sites and routes) is hand-written: keep dates hedged.
- `public/data/` is generated, but committed so the site builds without running the pipeline.

## Data tiers (keep the About panel in sync)
- A: historical-basemaps (GPL-3.0), snapshots up to 1880, used before 1886-01-01.
- B: CShapes 2.0 (CC BY-NC-SA 4.0), 1886-01-01 to 2019-12-31, filtered by the `start`/`end` day.
- C: Natural Earth (public domain), from 2020 on, and the grey land base.

## Commands
- `npm test` (Vitest unit tests), `npm run dev`, `npm run build`.
- `node tests/e2e-check.mjs [shotDir]` runs headless Edge against the dev server on port 5174.
- Installers (output in `release/`, git-ignored): `npm run dist:win` (Electron, NSIS x64, unsigned) and
  `npm run dist:android` (Capacitor, debug-signed APK; needs JDK 21 + Android SDK, see `pipeline/android-build.mjs`).
  Shells: `desktop/main.cjs` (serves `dist/` over `app://`), `android/` (Capacitor). Icons: `build/`.
- Data: `npm run data:fetch`, `data:build`, `data:entities` and `data:summaries` (slow, rate-limited), `data:fonts`.

## Rules
- No runtime calls to other sites (the artifact blocks them): Wikipedia text and glyphs are prebuilt.
- Data licences: `public/data/LICENSES.md`. CShapes is non-commercial, so no ads or paid features.
- Say how precise the borders are wherever a date is shown.
- In flight: `docs/next.md`. Failed approaches: `docs/dead-ends.md`.
- Releases: bump `version` in package.json, build both installers, tag `vX.Y.Z`, `gh release create` with both
  files, then update the Download table in README.md.
