# Roadmap (agreed 2026-11-07)

Work top to bottom. Tick items off here and move the one being worked on into `docs/next.md`.

## 1. Reach (done 2026-11-07)
- [x] GitHub Pages deploy (`.github/workflows/pages.yml`): https://thundertiki.github.io/history-globe/
- [x] Installable offline web app: `public/manifest.webmanifest`, `src/sw.js` (template filled in by
      `vite.config.ts`; shell cached on install, data cached on first use).
- [x] Share links: `#<date>/<lng>,<lat>,<zoom>/<place>` (place = NAME before 1886, CShapes gwcode to 2019, name
      after); Share button always links to the Pages URL.
- [ ] Release so the artifact, APK and Windows installer get the card-text fix (`hg-release` skill). Consider
      whether the APK is still needed now the web app installs.

## 2. Core features
- [x] **Search (done 2026-11-07):** type a polity name, list matches with the years they existed, tap to jump there with the card
      open. Data: `presence.json` (which snapshots/years each name appears in) + CShapes names/gwcodes. Reuse
      `findPlace()` and `showHit()` in `src/main.ts`. Must work offline (no runtime calls to other sites).
- [x] **Highlight what changed (done 2026-11-07; compare-two-dates view not done):** when the date crosses a border change, briefly outline the polities that
      changed (CShapes start/end days; snapshot-to-snapshot differences before 1886). The same diff can drive a
      later "compare two dates" view.
- [ ] **Fine date scrub on phones:** e.g. long-press the date for a month/day picker.

## 3. Content (vault phases 2-3)
- [ ] Rulers and capitals on the card from Wikidata (head of state / capital with dates), prebuilt like `wiki.json`.
- [ ] Cities as dated points: start with about 200 major historical capitals.
- [ ] Wars as dated areas/spans, not only point events.

## 4. Exploring
- [ ] Guided tours ("Fall of Rome", "Mongol expansion", "Decolonisation of Africa"): one JSON file per tour of
      steps (date, camera, caption), played with the existing date/camera code.
- [ ] Quiz mode: "Who ruled here in 1200?" Tap the map, then see the answer.

## 5. Data housekeeping
- [ ] Clean `pipeline/unmatched.txt` (blank lines, fragments like "(Russian and Japanese claim)"), then give
      peoples/cultures a plain "people / culture" card without a Wikipedia link.
- [ ] Still unverified: APK on a real phone since 0.1.2; full Windows installer run-through.
