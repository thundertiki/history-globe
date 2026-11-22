---
type: project
status: active
created: 2026-11-03
---
# History Globe

## Desired outcome
A free, open-source web app (repo `history-globe`): pick a date and see the world's borders on a 3D globe at that
moment, tap a country for what it was then. Covers 3000 BC to today. Desktop first, then phone, then public hosting.

## Why it matters
A shareable history explorer; curiosity and learning.

## Next action
```tasks
not done
path includes Next Actions
description includes [[History Globe]]
short mode
```

## Open tasks
Design (decided 2026-11-03):
- **Data tiers:** historical-basemaps snapshots (GPL-3.0) before 1886, so pre-1886 borders snap to the nearest
  earlier snapshot. CShapes 2.0 (CC BY-NC-SA) for 1886 to 2019, with day-exact changes. Natural Earth for 2020 on.
  The licences mean the app must be open source (GPL-3.0) and non-commercial.
- **Date slider:** years before 1500, months from 1500 to 1885, days from 1886 on. Typed dates and step buttons
  also work.
- **Tap a country:** its name, status/owner/capital (1886 on), a Wikipedia summary and link. Before 1886 the
  name is the period name. From 1886 on, CShapes gives modern names ("Russia (Soviet Union)" in 1914); a
  date-correct name table is a known gap.
- **Stack:** Vite + TypeScript + MapLibre 5 globe. A build pipeline simplifies the data and maps names to
  Wikipedia/Wikidata.

Phases:
1. ~~MVP: globe, slider, three border tiers, tap card, About/credits~~ (done 2026-11-03, desktop)
2. Events near the date; rulers, capital, population
3. Cities and sites as points
4. Phone polish; ~~make the repo public~~ (done 2026-11-04); ~~host on GitHub Pages~~ (done 2026-11-07)

## Notes log
- 2026-11-03: created and MVP built. All 9 unit tests and 6 headless browser checks pass (500 BC Achaemenids;
  Austria-Hungary in 1914; East Germany on 2 Oct 1990, gone on 3 Oct). 1,666 of 2,975 border names have a
  Wikipedia match. The rest are mostly peoples/regions, listed in `pipeline/unmatched.txt`.
- 2026-11-04: v0.2.0 released (Windows, Android, artifact): play through time, country timelines, Wikidata
  events, deep time to 300,000 BC with an early-humans layer. Audit follow-ups listed in the repo's docs/next.md.
- 2026-11-04: repo made public (commit emails rewritten to the GitHub noreply address); v0.2.1 released.
- 2026-11-07: live at https://thundertiki.github.io/history-globe/ (installable, works offline for visited dates),
  share links with date, map position and country. Ordered plan in the repo's `docs/roadmap.md`; search is next.
