# Next (one block per task in flight)

Full ordered plan: `docs/roadmap.md`.

## Search (done 2026-11-07, unverified on a phone)
- Search button in the top bar; `src/search.ts` + `public/data/search.json` (`npm run data:search`, run after
  `data:build`). Jumps to the first date a name appears and opens its card. `node tests/search-check.mjs` checks it.
- Not done: present-day (tier C) names, and names that only appear as map labels in tier B snapshots.

## Pending release
- 2026-11-07 changes (Pages, offline app, share links, light card text) are live on the web only; run `hg-release`
  to get the card-text fix into the artifact, APK and Windows installer.
- Unverified: APK on a real phone since 0.1.2 (edge-to-edge margins), Windows installer run-through, the Share
  button on a phone (share sheet / copy).
