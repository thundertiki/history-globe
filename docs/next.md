# Next (one block per task in flight)

Full ordered plan: `docs/roadmap.md`.

## Released in 0.5.0 (2026-11-10)
- Contents: bottom-sheet UI for card and search, era tabs, Next change button, flicker fix, rulers and capitals,
  Ko-fi link, search, change highlight. Specs: `docs/ui-redesign.md`, `docs/ui-redesign-plan.md`.
- Search: `src/search.ts` + `public/data/search.json` (`npm run data:search`, after `data:build`);
  `node tests/search-check.mjs`. Not done: present-day (tier C) names, names only on tier B map labels.
- Change highlight: `src/changes.ts`; `node tests/changes-check.mjs`.
- Rulers and capitals: `pipeline/rulers.mjs` (`npm run data:rulers`, about 40 min) -> `public/data/rulers.json`;
  `node tests/rulers-check.mjs`. Covers 549 of 2,004 polities; ancient ones mostly capital only.
- UI: `src/sheet.ts` (peek/half/full); checks `tests/ui-check.mjs`, `tests/eras-check.mjs`.

## Unverified on a real phone
- Sheet drag and heights, long-press on play for speed, keyboard with full-height search, Medieval tab label width.
- Older: APK since 0.1.2 (edge-to-edge margins), Windows installer run-through, Share button (share sheet / copy).
- Dot density around 1945.

## Next up
- Tours, then quizzes (roadmap sections 3 and 4).
- Possible: hand-written or Wikipedia-list pass for rulers of big ancient empires.
- Data and money research: `docs/market-research.md`. No commercial work yet (CShapes is non-commercial).
