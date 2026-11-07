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

## Pending release (0.3.0 shipped 2026-11-07; card-text fix, search and highlight are in all builds)
- 2026-11-07 changes (Pages, offline app, share links, light card text) are live on the web only; run `hg-release`
  to get the card-text fix into the artifact, APK and Windows installer.
- Unverified: APK on a real phone since 0.1.2 (edge-to-edge margins), Windows installer run-through, the Share
  button on a phone (share sheet / copy).
