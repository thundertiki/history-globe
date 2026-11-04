# Next (one block per task in flight)

## Names
- 1886+ period names come from matching CShapes features to historical-basemaps snapshots (`build.mjs`);
  review `pipeline/period-names.txt` for odd ones and fix snapshot errors in `pipeline/snapshot-renames.json`.
  Known quirks: West Germany shows "German Federal Republic" for 1945–49 (CShapes' own name).
- Unmatched Wikipedia names: `pipeline/unmatched.txt`; fix by hand in `pipeline/entity-overrides.json`.

## Phase 2+ (see the vault project note)
- Events near the date, rulers/capital/population (Wikidata, precomputed), then cities and sites.
- Public hosting: make the repo public, then GitHub Pages (free for public repos).
