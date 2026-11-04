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
