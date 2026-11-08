# Next (one block per task in flight)

Full ordered plan: `docs/roadmap.md`.

## Search (done 2026-11-07, unverified on a phone)
- Search button in the top bar; `src/search.ts` + `public/data/search.json` (`npm run data:search`, run after
  `data:build`). Jumps to the first date a name appears and opens its card. `node tests/search-check.mjs` checks it.
- Not done: present-day (tier C) names, and names that only appear as map labels in tier B snapshots.

## Highlight what changed (done 2026-11-07, unverified on a phone)
- `src/changes.ts`: on prev/next, a typed date or a timeline chip, polities new since the previous date get a gold
  outline for about 2 s plus a "Changed: ..." toast. Tier B only within 400 days; tier A = names new in the snapshot;
  none if more than 12 changed. Slider drags and playback never flash. `node tests/changes-check.mjs` checks it.

## Timeline tabs, flicker fix (done 2026-11-07, unreleased)
- Era tabs above the slider ( in ): the slider covers one era; a typed or searched date switches the tab.
- "Next change ▸" button jumps to the next border-change date and outlines what changed.
- Event/early-human dots hide while the slider moves or plays and return 250 ms after it settles; polity names draw above dots.
- start {"date":"28 Jul 1914","on":"1800–1945","min":"575462","max":"779175","ends":["1800","Borders on this day","1945"],"toast":""}
medieval {"date":"AD 500","on":"Medieval","min":"353352","max":"420021","ends":["AD 500","Borders as of c. AD 500 (snapshot)","1500"],"toast":""}
next change {"date":"AD 600","on":"Medieval","min":"353352","max":"420021","ends":["AD 500","Borders as of c. AD 600 (snapshot)","1500"],"toast":""}
1945-now {"date":"1 Jan 1945","on":"1945–now","min":"779176","max":"1000000","ends":["1945","Borders on this day","Today"],"toast":""}
PASS [] checks tabs and the button.

## Pending release (0.3.0 shipped 2026-11-07; card-text fix, search and highlight are in all builds)
- 2026-11-07 changes (Pages, offline app, share links, light card text) are live on the web only; run `hg-release`
  to get the card-text fix into the artifact, APK and Windows installer.
- Unverified: APK on a real phone since 0.1.2 (edge-to-edge margins), Windows installer run-through, the Share
  button on a phone (share sheet / copy).
