# Data licences

The app's code is GPL-3.0-or-later (see `LICENSE` at the repo root). Every data source, its licence, and what the
app uses it for. Keep this table, `src/about.ts` and `CLAUDE.md` ("Data tiers") in sync.

## Sources

| Source | Licence | Used for | What the licence allows | Blocks selling? |
|---|---|---|---|---|
| [historical-basemaps](https://github.com/aourednik/historical-basemaps), André Ourednik and contributors | GPL-3.0 | Tier A borders for every date before 1886 (about 40 snapshots, 123,000 BC to 1880); also the period names (e.g. "Russian Empire") given to 1886+ polities | Use, change and sell, including commercially, as long as anything built from it is also released under GPL-3.0 with its source and credit | No, but the source must stay open |
| [CShapes 2.0](https://icr.ethz.ch/data/cshapes/), Schvitz, Girardin, Rüegger, Weidmann, Cederman & Gleditsch (2022) | CC BY-NC-SA 4.0 | Tier B borders, day-exact, 1886-01-01 to 2019-12-31; country codes for share links; border-change dates ("Next change", "what changed") | Copy and adapt with credit, for non-commercial use only, and share changes under the same licence | **Yes**: no ads, paid features, in-app purchases or paid downloads |
| [Natural Earth](https://www.naturalearthdata.com/) admin-0 | Public domain | Tier C present-day borders (2020 on) and the grey land base | Anything, no credit needed | No |
| [Wikidata](https://www.wikidata.org/) | CC0 | Battles, sieges, treaties and city foundings (event dots); Wikipedia article titles and IDs | Anything, no credit needed | No |
| [Wikipedia](https://www.wikipedia.org/) text | CC BY-SA 4.0 | Intro text on each card, collected at build time and credited on the card | Use and sell with credit and a link to the licence; changed text must be shared under the same licence | No |
| Wikipedia thumbnails (Wikimedia Commons) | Each image has its own licence (CC BY, CC BY-SA, public domain...) | The article's lead image on each card, loaded from Wikimedia when the card opens (hidden if it fails) | Commons only holds images that allow commercial use, but most need per-image credit, which the app does not show yet | No, but a paid version would need per-image credits |
| Early human sites and routes, compiled for this app from published estimates | GPL-3.0, like the app | The early-humans layer (approximate dates) | Ours: anything, since we wrote it | No |
| [Open Sans](https://fonts.google.com/specimen/Open+Sans) glyphs | Apache-2.0 | Map labels (`public/fonts/`) | Use and sell, keep the licence notice | No |
| [MapLibre GL JS](https://maplibre.org/) | BSD-3-Clause | Rendering the globe | Use and sell, keep the licence notice | No |

Only CShapes blocks monetization. To sell the app or take ads, replace it (tier B would need other day-exact data, or
fall back to tier A snapshots) and add Wikimedia image credits. The app's code is GPL-3.0 and stays open either way.

## Files in `public/data/`

| Path | Built from |
|---|---|
| `borders/a/` | historical-basemaps, simplified |
| `borders/b/` | CShapes, simplified, with period names added from historical-basemaps |
| `borders/c/` | Natural Earth, simplified |
| `events.json` | Wikidata |
| `rulers.json` | Wikidata (head of state, capital, with dates; `npm run data:rulers`) |
| `human.json` | hand-written |
| `presence.json`, `search.json` | the border files above (which snapshots and dates each name appears in); `search.json` powers Search |
| `wiki.json`, `entities.json`, `eras.json` | Wikipedia and Wikidata (titles, intro text, period articles like "Old Kingdom of Egypt" matched by date) |

Because of CShapes, this app and any copy of `borders/b/` (and files built from it: `search.json`, parts of
`presence.json`) must stay non-commercial: no ads, paid features or in-app purchases. Dropping CShapes would lift
that, but tier B (1886 to 2019, day-exact) would need other data. Historical-basemaps is GPL-3.0, so a paid copy
would still have to publish its source.
