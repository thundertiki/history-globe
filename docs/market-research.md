# Data alternatives and competitors (scan of 2026-11-07)

Method: the `scanning-game-trends` protocol (dated, sourced, lifecycle-placed), adapted from mobile games to a
history atlas app. Store charts and download figures were not available, so market-size claims are thin. Anything
marked "unverified" was not read on a primary page.

## 1. Data: what could replace CShapes (the only source that blocks monetization)

| Candidate | Licence | Coverage | Fit |
|---|---|---|---|
| **Cliopatria** (Seshat Global History Databank; [GitHub](https://github.com/Seshat-Global-History-Databank/cliopatria), [Zenodo](https://zenodo.org/records/13363121)) | CC BY 4.0 (LICENSE.md and Zenodo records; one aggregator listed a CC BY NC version, not seen on the primary pages) | 3400 BCE to 2024 CE, 1,600+ polities, about 14K shape records, Wikidata IDs, year precision, "frame years" only; 299 MB in v0.2.1 | Strongest candidate. Could replace tier A and tier B in one dataset, and extends to 2024. Loses day-exact borders (1886 to 2019). Needs simplifying; accuracy of modern borders unchecked |
| **OpenHistoricalMap** ([licence](https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/License)) | CC0 by default; some elements CC BY or CC BY-SA (tagged `license=*`) | Community-edited, uneven coverage, strongest for recent history | Possible gap-filler or live layer; check per-element licences |
| **Historical National Boundaries** (U Minnesota, [DRUM](https://conservancy.umn.edu/server/api/core/bitstreams/a7b01df8-5833-4afa-9e83-f7ce2b554b58/content)) | CC BY 3.0 US (per search result; check DRUM terms) | Snapshots c. 1800, 1914, 1918, 1939, 1945, 1970, 1990, 2000 | A commercial-safe stand-in for 1800 to 2000 snapshots, less detail than CShapes |
| **Natural Earth**, **Wikidata** | Public domain, CC0 | Today; events and IDs | Already used |

Not found or unverified: Wikidata start and end dates of countries for a date-exact tier (not searched properly);
the licence of Chronas data; Geacron's data terms (proprietary per AlternativeTo).

**Recommendation:** prototype a build on Cliopatria. Keep CShapes only in the free, non-commercial build if
day-exact borders matter, or drop tier B detail for 1886 to 2019 in a commercial build. Decide after comparing 1914,
1945 and 1990 maps side by side.

## 2. Competitors (lifecycle: a small, fragmented niche; no clear leader found)

| App | What it does | Price / model | Gap |
|---|---|---|---|
| [GeaCron](https://alternativeto.net/software/geacron/) | Year-by-year world map from 3000 BC; web | Freemium, proprietary | Site returned empty to our fetch (unverified); no offline or open data |
| [Chronas](https://freetech4teach.teachermade.com/?p=14522) | Open-source interactive map with 50M data points, user-curated | Free | Unclear if maintained (page needed JavaScript, unverified) |
| OpenHistoricalMap ([Wikipedia](https://en.wikipedia.org/wiki/OpenHistoricalMap)) | Community map with a time dimension | Free, CC0 | Editor-oriented, not a casual app |
| "World History Map: Empires" (Jododdle, iOS) | Timeline of empires 3000 BC to 1900 AD | $9.99 one-off per a third-party report ([listing](https://appshunter.io/ios/topics/historical-maps)); app page not verified | Stops at 1900; iOS only |
| OldMapsOnline - History & Maps (iOS) | Pick a year, see boundaries | Free with ads and IAP; reported buggy | Performance |
| [ArcheoEarth](https://apps.apple.com/app/id6761521522) (iOS) | Map of historical places, audio guides | Free + Premium ($3.99 to $59.99), too few ratings to show | Places, not borders |

No Android app showing borders by date turned up (store search not possible here; check Google Play by hand).

## 3. What we could do better

- **Offline, free, fast on Android and iOS** (web app installs; APK sideloads). The paid iOS competitor stops at 1900.
- **Day-exact borders 1886 to 2019** with a "Next change" button and outlined changes: no competitor found does this.
- **Search by name with jump-to-date**, event dots, early-human layer back to 300,000 BC, share links.
- **Gaps to build:** rulers and capitals, guided tours, quizzes, compare-two-dates.

## 4. Money signals

- GeoGuessr (owns Seterra): subscription is its main revenue; a Swedish report (March 2026, secondary) says 50% revenue growth and about 190 MSEK profit; Dealroom puts revenue at $10 to 50M. Seterra is estimated at 2M installs, 46K MAU, free with a paid ad-free tier ([AppGoblin](https://appgoblin.info/apps/com.seterra), estimates).
- No reliable figures for history quiz apps. Quizzes plausibly monetize as a subscription or a one-off unlock, but that requires dropping CShapes first.

## 5. Next actions

1. Download Cliopatria v0.2.1 and compare 1914, 1945, 1990 against CShapes (geometry quality, polity names, size after simplifying).
2. Read the Cliopatria paper (Scientific Data 12, 247, 2025) for accuracy limits.
3. Check the DRUM licence page and OHM coverage for 1886 to 2019.
4. Look at Google Play and the App Store by hand for competitors' ratings and prices.
5. Decide: stay free and non-commercial (donations only), or plan a Cliopatria-based commercial build.

## 6. Cliopatria trial (2026-11-07)

Downloaded v0.2.1 (Zenodo 10.5281/zenodo.23128623, licence field `cc-by-4.0`, `LICENSE.md` says CC BY 4.0) into
git-ignored `pipeline/raw/cliopatria/` (zip 299 MB; `cliopatria_polities_only_v021.geojson` 173 MB). Probes:
`pipeline/probes/cliopatria-stats.mjs <geojson>` and `cliopatria-render.mjs <geojson> <outdir> <years...>`
(flat-map PNG per year; needs `playwright-core`, run with `node --max-old-space-size=4096`).

**What it has:** 13,797 shape records, 1,637 polity names, fields `Name, FromYear, ToYear, Area, Type, Wikipedia,
Wikidata, SeshatID, Components, MemberOf`. 508 distinct start years: sparse in antiquity (frame years every 100 to
200 years), then **near-annual from about 1850** (median span of a shape from 1886 on is 2 years). Polities alive:
4 in 3000 BC, 48 in 500 BC, 133 in AD 1000, 141 in 1200 and 1500, 130 in 1800, 79 in 1914, 77 in 1945, 165 in
1990, 195 in 2020 and 2024. A bonus over our data: 2020 to 2024 are covered, and every polity has a Wikipedia and
Wikidata link (could replace our hand-built `entities.json` matching).

**Compared with today's data:**
- 1914: Cliopatria draws 79 polities where CShapes plus period names gives about 124. Colonies are merged into their
  empire (Components/MemberOf), so the 1914 map is coarser but cleaner. Total area at 1914 is 171 million km² against
  about 149 million of land, so shapes overlap somewhere (not investigated).
- 1945: 77 polities; Germany has no shape for 1945 to 1949 (the Federal Republic starts 1950).
- 1990: 165 polities, looks complete and accurate at world scale.
- Not day-exact: nothing here replaces CShapes' daily borders, so the "Next change" button and the
  "Changed: Germany" outline would work by year, not by day.
- Size: simplified to 5% with mapshaper (`-simplify 5% keep-shapes`, quantization 1e5), all eras in one TopoJSON is
  16 MB (172,465 intersections could not be repaired). Our whole tier A is 5 MB, so it would need splitting by era
  and a tighter simplification.

**Verdict:** a commercial-safe base for tier A and for 1886 to 2024 at year precision. Good for coverage and links;
weaker for fine date precision and for 1900-1945 colonies. Worth a prototype branch before deciding.

**Unanswered:** accuracy against historians' maps; why areas overlap; what MemberOf does to the drawing order;
whether a gap year (Germany 1945 to 1949) is common.
