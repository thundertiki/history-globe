# Roadmap (agreed 2026-11-07)

Work top to bottom. Tick items off here and move the one being worked on into `docs/next.md`.

## 1. Reach (done 2026-11-07)
- [x] GitHub Pages deploy (`.github/workflows/pages.yml`): https://thundertiki.github.io/history-globe/
- [x] Installable offline web app: `public/manifest.webmanifest`, `src/sw.js` (template filled in by
      `vite.config.ts`; shell cached on install, data cached on first use).
- [x] Share links: `#<date>/<lng>,<lat>,<zoom>/<place>` (place = NAME before 1886, CShapes gwcode to 2019, name
      after); Share button always links to the Pages URL.
- [x] Release with the card-text fix (shipped by 0.5.0). Open question: is the APK still needed now the web app installs?

## 2. Core features
- [x] **Search (done 2026-11-07):** type a polity name, list matches with the years they existed, tap to jump there with the card
      open. Data: `presence.json` (which snapshots/years each name appears in) + CShapes names/gwcodes. Reuse
      `findPlace()` and `showHit()` in `src/main.ts`. Must work offline (no runtime calls to other sites).
- [x] **Highlight what changed (done 2026-11-07; compare-two-dates view not done):** when the date crosses a border change, briefly outline the polities that
      changed (CShapes start/end days; snapshot-to-snapshot differences before 1886). The same diff can drive a
      later "compare two dates" view.
- [ ] **Fine date scrub on phones:** e.g. long-press the date for a month/day picker.

## 3. Content (phases 2-3 of `docs/archive/vault-plan.md`)
- [x] (done 2026-11-07, coverage thin before 1800) Rulers and capitals on the card from Wikidata (head of state / capital with dates), prebuilt like `wiki.json`.
- [ ] Cities as dated points: start with about 200 major historical capitals.
- [ ] Wars as dated areas/spans, not only point events.

## 4. Exploring
- [x] Guided tours (0.6.0, 2026-11-17): Fall of Rome, Mongol Empire, Breakup of the USSR. Sections and stops,
      alliance shading, treaty lines, flat view, `#tour=` links. Design: `docs/superpowers/specs/2026-11-16-guided-tours-design.md`.
- [ ] More tours: World War I (large, with alliances; next release), then European empires 1886–1975 and WWII.
- [ ] Tour or feature suggestion box (Google Form or GitHub issue form; not decided).
- [ ] Quiz mode: "Who ruled here in 1200?" Tap the map, then see the answer.

## 5. Data housekeeping
- [ ] Clean `pipeline/unmatched.txt` (blank lines, fragments like "(Russian and Japanese claim)"), then give
      peoples/cultures a plain "people / culture" card without a Wikipedia link.
- [ ] Still unverified: APK on a real phone since 0.1.2; full Windows installer run-through.

## Strategy (decided 2026-11-07)
- **Stay free and non-commercial for now.** CShapes (CC BY-NC-SA) gives the best data (day-exact borders 1886 to
  2019) and rules out ads, paid features and in-app purchases. We will not ask the CShapes authors for a licence.
- **Make the free app feature rich** (sections 2 to 4 above), then release (0.4.0 has era tabs and Next change).
- **Ko-fi donation link** (voluntary, no features behind it): Ko-fi page: https://ko-fi.com/J2Y62A9SV0 (added to About and README 2026-11-07); a
  web page link is still to do.
- **Paid features only if we find comparably good free-to-sell data.** Plan and evidence: `docs/market-research.md`
  (Cliopatria CC BY base + Wikidata day dates + our overrides + filtered OpenHistoricalMap). Trial data is in
  git-ignored `pipeline/raw/cliopatria/`; probes in `pipeline/probes/`. Revisit when the free app's feature list is done.
