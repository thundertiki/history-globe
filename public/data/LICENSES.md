# Data licences

The app's code is GPL-3.0-or-later (see `LICENSE` at the repo root). Every data source, its licence, and what the
app uses it for. Keep this table, `src/about.ts` and `CLAUDE.md` ("Data tiers") in sync.

## Sources

| Source | Licence | Used for |
|---|---|---|
| [historical-basemaps](https://github.com/aourednik/historical-basemaps), André Ourednik and contributors | GPL-3.0 | Tier A borders for every date before 1886 (about 40 snapshots, 123,000 BC to 1880); also the period names (e.g. "Russian Empire") given to 1886+ polities |
| [CShapes 2.0](https://icr.ethz.ch/data/cshapes/), Schvitz, Girardin, Rüegger, Weidmann, Cederman & Gleditsch (2022) | **CC BY-NC-SA 4.0** (non-commercial, share alike) | Tier B borders, day-exact, 1886-01-01 to 2019-12-31; country codes for share links; border-change dates ("Next change", "what changed") |
| [Natural Earth](https://www.naturalearthdata.com/) admin-0 | Public domain | Tier C present-day borders (2020 on) and the grey land base |
| [Wikidata](https://www.wikidata.org/) | CC0 | Battles, sieges, treaties and city foundings (event dots); Wikipedia article titles and IDs |
| [Wikipedia](https://www.wikipedia.org/) | CC BY-SA 4.0 | Intro text on each card, collected at build time and credited on the card. The small thumbnail is the article's lead image, loaded from Wikimedia when the card opens (hidden if it fails; each image has its own Commons licence) |
| Early human sites and routes, compiled for this app from published estimates | GPL-3.0, like the app | The early-humans layer (approximate dates) |
| [Open Sans](https://fonts.google.com/specimen/Open+Sans) glyphs | Apache-2.0 | Map labels (`public/fonts/`) |
| [MapLibre GL JS](https://maplibre.org/) | BSD-3-Clause | Rendering the globe |

## Files in `public/data/`

| Path | Built from |
|---|---|
| `borders/a/` | historical-basemaps, simplified |
| `borders/b/` | CShapes, simplified, with period names added from historical-basemaps |
| `borders/c/` | Natural Earth, simplified |
| `events.json` | Wikidata |
| `human.json` | hand-written |
| `presence.json`, `search.json` | the border files above (which snapshots and dates each name appears in); `search.json` powers Search |
| `wiki.json`, `entities.json`, `eras.json` | Wikipedia and Wikidata (titles, intro text, period articles like "Old Kingdom of Egypt" matched by date) |

Because of CShapes, this app and any copy of `borders/b/` (and files built from it: `search.json`, parts of
`presence.json`) must stay non-commercial: no ads, paid features or in-app purchases. Dropping CShapes would lift
that, but tier B (1886 to 2019, day-exact) would need other data. Historical-basemaps is GPL-3.0, so a paid copy
would still have to publish its source.
