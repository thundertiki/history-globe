# Data pipeline

Scripts in `pipeline/`, run in this order:
1. `fetch.sh` downloads into `raw/` (git-ignored).
2. `build.mjs` simplifies to `public/data/borders/` (each file: `borders` + one-per-polity `labels`) and adds 1886+
   period names.
3. `search.mjs` builds `search.json` for the search box (after `build.mjs`).
4. `entities.mjs` + `entities-search.mjs` map names to Wikipedia.
5. `eras.mjs` maps old-map names like "Egypt" to period articles by date (`pipeline/eras.json`); run before
   `summaries.mjs`.
6. `summaries.mjs` prebuilds `wiki.json` (slow, rate-limited).
7. `apply-overrides.mjs` applies `entity-overrides.json` and resolves new names.
8. `fonts.mjs` fetches label glyphs into `public/fonts/`; `events.mjs` pulls Wikidata events into `events.json`.
9. `artifact.mjs` packages the artifact.

`public/data/human.json` (early human sites and routes) is hand-written: keep dates hedged.
`public/data/` is generated, but committed so the site builds without running the pipeline.
npm shortcuts: `npm run data:fetch`, `data:build`, `data:entities`, `data:summaries`, `data:fonts`.
