# Data licences

The app's code is GPL-3.0-or-later (see `LICENSE` at the repo root). The data files here have their own terms:

| Path | Source | Licence |
|---|---|---|
| `borders/a/` | [historical-basemaps](https://github.com/aourednik/historical-basemaps), André Ourednik and contributors, simplified | GPL-3.0 |
| `borders/b/` | [CShapes 2.0](https://icr.ethz.ch/data/cshapes/), Schvitz, Girardin, Rüegger, Weidmann, Cederman & Gleditsch (2022), simplified; period names added from historical-basemaps | **CC BY-NC-SA 4.0**: non-commercial, share alike |
| `borders/c/` | [Natural Earth](https://www.naturalearthdata.com/) admin-0, simplified | Public domain |
| `events.json` | Battles, sieges, treaties and city foundings from [Wikidata](https://www.wikidata.org/) | CC0 |
| `human.json` | Early human sites and routes, compiled for this app from published estimates (approximate) | GPL-3.0, like the app |
| `presence.json`, `wiki.json` | Built from the files above; `wiki.json` holds Wikipedia intro text | as their sources; Wikipedia text CC BY-SA 4.0 |
| `entities.json` | Titles and IDs from [Wikipedia](https://www.wikipedia.org/) and [Wikidata](https://www.wikidata.org/) | Wikidata CC0; titles are facts |

Because of CShapes, this app and any copy of `borders/b/` must stay non-commercial. Wikipedia summaries shown in
the app are collected at build time (`wiki.json`) and are CC BY-SA 4.0, credited on each card.
