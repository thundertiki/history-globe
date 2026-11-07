# Next (one block per task in flight)

Full ordered plan: `docs/roadmap.md`.

## Search (next up, not started)
- Type a polity name, list matches with the years they existed, tap to jump there with the card open.
- Data: `public/data/presence.json` + CShapes names/gwcodes; reuse `findPlace()` / `showHit()` in `src/main.ts`.
- Read first: src/main.ts, src/panel.ts, src/history.ts, src/borders.ts.
- Testing: the Browser pane pauses map rendering while hidden; use headless Edge (`tests/e2e-check.mjs` pattern)
  against `npm run preview` on port 4173.

## Pending release
- 2026-11-07 changes (Pages, offline app, share links, light card text) are live on the web only; run `hg-release`
  to get the card-text fix into the artifact, APK and Windows installer.
- Unverified: APK on a real phone since 0.1.2 (edge-to-edge margins), Windows installer run-through, the Share
  button on a phone (share sheet / copy).
