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
