# history-globe: pick a date, see the world's borders on a 3D globe

Free, open-source (GPL-3.0) web app; public repo since 2026-11-04 (no personal paths or secrets in it). Web:
https://thundertiki.github.io/history-globe/, deployed by `.github/workflows/pages.yml` on every push to `main`;
installable offline app via `public/manifest.webmanifest` + `src/sw.js` (a template that `vite.config.ts` fills in;
registered only on http(s) web, not in the artifact, Electron or Capacitor). Also a Claude artifact built from the
same code (`npm run build:artifact`, publish `dist-artifact/page.html` + its files).
Project state and Ben's next actions: Beacon project "History Globe".

## Layout
- `src/`: Vite + TypeScript + MapLibre GL 5 (globe projection), no framework.
  - `dates.ts`: `HDate` with astronomical years (1 BC = 0). Never use JS `Date` before 1900.
  - `timeline.ts`: non-linear slider (deep time 1,000/100-year steps from 300,000 BC, years from 3000 BC, months
    from 1500, days from 1886).
  - `history.ts`: the card's timeline chips. Overlays (events, early humans) live in `globe.ts`.
  - `borders.ts`: picks the tier for a date. `globe.ts`: map and layers. `panel.ts`: tap card. `about.ts`: credits.
  - Tours: hand-written `public/data/tours/<id>.json` + `index.json`; `tours.ts` (types, checks, `#tour=` links),
    `tour-panel.ts` (sheet view), `applyStop`/`exitTour` in `main.ts`. Text rules: tone section of
    `docs/superpowers/specs/2026-11-16-guided-tours-design.md`. Checks: `npm run check:tours`,
    `node tests/tours-ui-check.mjs` (uses `tests/fixtures/sample-tour.json`).
- `pipeline/`: builds the committed, generated `public/data/`. Script order and rules: `docs/pipeline.md`.

## Data tiers (keep the About panel in sync)
- A: historical-basemaps (GPL-3.0), snapshots up to 1880, used before 1886-01-01.
- B: CShapes 2.0 (CC BY-NC-SA 4.0), 1886-01-01 to 2019-12-31, filtered by the `start`/`end` day.
- C: Natural Earth (public domain), from 2020 on, and the grey land base.

## Commands
- `npm test` (Vitest unit tests), `npm run dev`, `npm run build`.
- `node tests/e2e-check.mjs [shotDir]` runs headless Edge against the dev server on port 5174.
- Installers (output in `release/`, git-ignored): `npm run dist:win` (Electron, NSIS x64, unsigned) and
  `npm run dist:android` (Capacitor, debug-signed APK; JDK 21 + Android SDK paths in git-ignored
  `pipeline/android-build.local.json`).
  Shells: `desktop/main.cjs` (serves `dist/` over `app://`), `android/` (Capacitor). Icons: `build/`.
## Rules
- No runtime calls to other sites (the artifact blocks them): Wikipedia text and glyphs are prebuilt.
- Data licences: `public/data/LICENSES.md`. CShapes is non-commercial, so no ads or paid features.
- Say how precise the borders are wherever a date is shown.
- In flight: `docs/next.md`. Ordered plan and strategy: `docs/roadmap.md`. Failed approaches: `docs/dead-ends.md`.
  Data alternatives, competitors, monetization: `docs/market-research.md`.
- Releases: follow the `hg-release` skill (version bump, Windows + Android + artifact builds, artifact republish,
  tag, GitHub release, README Download table).
