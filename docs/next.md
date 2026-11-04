# Next (one block per task in flight)

## Entity matching
- 1,309 of 2,975 border names have no Wikipedia match (`pipeline/unmatched.txt`), mostly peoples/regions in
  historical-basemaps. Add overrides in `pipeline/entity-overrides.json`, or try a second pass that strips
  parentheses and suffixes like "(FR)". Check that "Rome" and other city-named polities point to the polity.

## Labels
- Multi-part countries get one label per part (several "United Kingdom" labels). Consider one label per polity
  at its largest part (precompute label points in the pipeline).

## Phase 2+ (see design in the vault)
- Events near the date, rulers/capital/population (Wikidata, precomputed), then cities and sites, then phone
  polish and GitHub Pages hosting.

## Period-correct names from 1886
- CShapes `country_name` is the modern Gleditsch-Ward label, so 1914 shows "Russia (Soviet Union)", "Mali",
  "Tanzania (Tanganyika)". Build a name table keyed by gwcode + date range (Wikidata "official name"/"replaces",
  or hand-checked for the main cases) and use it for labels and the panel heading.

## Before the repo goes public
- Add `public/data/LICENSES.md` (and a README note): `borders/a/` is GPL-3.0 (historical-basemaps),
  `borders/b/` is CC BY-NC-SA 4.0 (CShapes 2.0), `borders/c/` is public domain. The repo GPL LICENSE alone
  misstates the CShapes files.
