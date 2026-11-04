# Dead ends

- `queryRenderedFeatures()` over the whole viewport misses features on the globe projection (MapLibre 5), so a
  test showed Germany "missing" when it was drawn. Tests query the source with the layer filter instead
  (`querySourceFeatures`).
- Wikipedia API at 200 ms between batches gets HTTP 429; `entities.mjs` waits 1.5 s and honours `retry-after`.
