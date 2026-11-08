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
