# Dead ends

- `queryRenderedFeatures()` over the whole viewport misses features on the globe projection (MapLibre 5), so a
  test showed Germany "missing" when it was drawn. Tests query the source with the layer filter instead
  (`querySourceFeatures`).
- Wikipedia API at 200 ms between batches gets HTTP 429; `entities.mjs` waits 1.5 s and honours `retry-after`.
- One inner point per CShapes feature vs a grid-point majority vote for period names: both gave "White
  Russia" for the USSR in 1930, because the 1930 snapshot itself names it so. Fix source errors in
  `snapshot-renames.json` instead.
- The Claude artifact's sandbox blocks fetches to other hosts (Wikipedia, MapLibre's demo font server), so
  summaries are prebuilt (`summaries.mjs` -> `wiki.json`) and glyphs ship in `public/fonts/`.
- MapLibre's `glyphs` URL must contain `{fontstack}`; the font folder is `OpenSansSemibold` (no spaces).
- **Guarded Wikipedia search pass for unmatched names** (2026-11-04, confirmed): rate-limited so hard it ran
  ~50 min without finishing; stopped. Revisit if: run as an overnight background job.
- **Serving `.pbf` glyphs in the Claude artifact** (2026-11-04, confirmed): the host refuses that type; glyphs ship
  as base64 `.json` via the `hgfont://` protocol. Revisit if: artifacts serve binary types.
- **`['==', 1, 0]` as an always-false MapLibre filter** (2026-11-04, confirmed): parsed as a legacy filter ("string
  expected"), so the layer is never created. Use `['boolean', false]`. Revisit if: never.
- **Raw Wikidata query-service dates** (2026-11-04, confirmed): astronomical years (-1456 = 1457 BC) and always
  Gregorian, so Hastings read 20 Oct; `events.mjs` converts Julian items back. Revisit if: never.
