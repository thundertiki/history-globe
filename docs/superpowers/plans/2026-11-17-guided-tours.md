# Guided Tours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sectioned, step-through guided tours (with alliance shading, treaty arrows, optional flat view and share
links) plus four tours, released as 0.6.0.

**Architecture:** Tours are hand-written JSON in `public/data/tours/`. A pure module (`src/tours.ts`) types,
validates and indexes them; `Globe` gains tour map-state methods (blocs, arrows, highlight, flat view); a UI module
(`src/tour-panel.ts`) renders the selector, sections and item detail into a new sheet view; `main.ts` wires apply,
exit and the `#tour=` hash.

**Tech Stack:** Vite + TypeScript, MapLibre GL 5, Vitest, playwright-core headless checks (msedge).

**Spec:** `docs/superpowers/specs/2026-11-16-guided-tours-design.md` (read it, especially Tone and Appendix A).

## Global Constraints
- No runtime calls to other sites; Wikipedia links open in a new tab (`target="_blank" rel="noopener"`), direct
  article URLs `https://en.wikipedia.org/wiki/<Title_with_underscores>`.
- Polity refs: tier B (1886-01-01 to 2019-12-31) CShapes `gwcode` as a string; tier A snapshot `NAME`.
- Item dates use the hash date format (`1914-07-28`, `1914-07`, `1914`, negative years astronomical), parsed with
  `parseDate` from `src/dates.ts`. Never JS `Date` before 1900.
- Every item's date line shows border precision (reuse `precisionText` in `main.ts`).
- Bloc colours: readable on the dark map, never gold (gold = highlight/flash).
- Tone rule from the spec applies to all text; hedge figures, word disputed claims as claims.
- Public repo: no personal paths, emails or secrets. Use `npm --prefix`, `git -C`, absolute paths (no `cd &&`).
- WWI: 40-60 items is a target; never fewer than about 30; never pad.

## Review Focus
1. A `#tour=` link with an unknown tour or item id: app starts normally at the default view with a toast
   "Tour not found", no exception. (Task 4 test.)
2. Exiting a tour from flat view, with blocs/arrows/highlight on: globe projection, layers and the normal hash
   all come back. (Task 5 check.)
3. Tapping ▶ several times quickly: the map ends showing the last item's borders and map state, not an earlier
   one's. (Task 5 check; map state applies only for the latest render sequence.)
4. A bloc member or highlight ref that does not exist at the item's date: skipped at runtime; flagged by the data
   check. (Task 2 check.)
5. Tapping a polity or event dot during a tour: its normal card opens with "◀ Back to tour"; the tour stays
   active and Back returns to the same item. (Task 5 check.)

---

### Task 1: Tour types, validation and hash helpers

**Files:**
- Create: `src/tours.ts`
- Test: `tests/tours.test.ts`

**Interfaces:**
- Produces:
  - `interface Camera { center: [number, number]; zoom: number; bearing?: number; pitch?: number }`
  - `interface MapState { date: string; camera: Camera; view?: 'flat'; highlight?: string[]; blocs?: boolean; arrows?: string[] }`
    (`blocs: true` = show the tour's blocs at this date; `arrows` = ids from the tour's `arrows`)
  - `type ItemKind = 'event' | 'battle' | 'player' | 'alliances' | 'text'`
  - `interface Item extends MapState { id: string; kind: ItemKind; title: string; when?: string; text: string; wiki?: string }`
    (`when` = display date range, e.g. "21 Feb – 18 Dec 1916"; `wiki` = article title)
  - `interface Section extends MapState { id: string; title: string; intro: string; items: Item[] }`
  - `interface Bloc { id: string; name: string; color: string; members: { ref: string; from: string; to?: string }[] }`
  - `interface Arrow { id: string; from: [number, number]; to: [number, number]; label: string; text: string; wiki?: string }`
  - `interface Tour { id: string; title: string; years: string; summary: string; blocs?: Bloc[]; arrows?: Arrow[]; sections: Section[] }`
  - `interface TourIndexEntry { id: string; title: string; years: string; summary: string; items: number }`
  - `validateTour(raw: unknown): string[]` — list of problems, empty when valid
  - `stops(t: Tour): (Section | Item)[]` — section intro then its items, in order (what ◀/▶ walk)
  - `findStop(t: Tour, id: string): { stop: Section | Item; index: number } | undefined`
  - `blocsAt(blocs: Bloc[], date: string): Map<string, Bloc>` — ref -> bloc for members active on `date`
  - `parseTourHash(hash: string): { tour: string; item?: string } | undefined`
  - `tourHash(tour: string, item?: string): string` — `#tour=<tour>/<item>`
  - `wikiUrl(title: string): string`

- [ ] **Step 1: Write failing tests** in `tests/tours.test.ts` (`describe('tours')`):
  - `validateTour` returns `[]` for a minimal valid tour (one section, one item) and returns messages containing
    the item id for: missing `text`, unparseable `date` (`'1914-13-40'`), duplicate ids across sections and items,
    `arrows: ['x']` with no arrow `x`, `blocs: true` when the tour has no `blocs`.
  - `stops` order for 2 sections × 2 items is `[s1, i1, i2, s2, i3, i4]`.
  - `blocsAt`: Italy `{ ref: '325', from: '1915-05-23' }` is absent on `'1915-05-22'`, present on `'1915-05-23'`;
    Russia `{ ref: '365', from: '1914-08-01', to: '1918-03-03' }` absent on `'1918-03-03'` (`to` is exclusive).
  - `parseTourHash('#tour=ww1/verdun')` → `{ tour: 'ww1', item: 'verdun' }`; `'#tour=ww1'` → `{ tour: 'ww1' }`;
    `'#1914-07-28/0,0,1'` → `undefined`; `tourHash('ww1','verdun') === '#tour=ww1/verdun'`.
  - `wikiUrl('Battle of Verdun') === 'https://en.wikipedia.org/wiki/Battle_of_Verdun'`.
- [ ] **Step 2:** `npx vitest run --root C:/Users/Benjamen/Projects/history-globe tests/tours.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement `src/tours.ts`. Dates compare via `isoDay(parseDate(x))` string comparison (same as
  CShapes `start`/`end`); encode `wikiUrl` with spaces → `_` then `encodeURI`.
- [ ] **Step 4:** Same command → PASS; `npx tsc -p C:/Users/Benjamen/Projects/history-globe` clean.
- [ ] **Step 5:** Commit `Tours: types, validation, hash helpers`.

### Task 2: Placeholder tour, index and data check

**Files:**
- Create: `public/data/tours/index.json` (array of `TourIndexEntry`), `public/data/tours/sample.json` (2 sections,
  4 items, 1 bloc pair, 1 arrow, 1 flat item; WWI-era so it exercises tier B; marked "Sample" in the title — removed
  in Task 7), `tests/tours-data.test.ts` (a Vitest file, so it imports `src/tours.ts` and `src/borders.ts`
  directly and runs with `npm test`; read data with `node:fs`)
- Modify: `package.json` (script `"check:tours": "vitest run tests/tours-data.test.ts"`)

**Interfaces:**
- Consumes: `validateTour`, `stops` (Task 1); `pickBorders` (`src/borders.ts`).
- Produces: `npm run check:tours` — fails on any problem; also part of `npm test`.

- [ ] **Step 1:** Write `tests/tours-data.test.ts`: one test per file in `index.json` asserting `validateTour` is
  `[]`; the index `items` count equals `stops(t).length`; every `highlight` and bloc-member `ref` exists at the
  stop's date (tier B: a CShapes geometry with that `gwcode` and `start <= day <= end`; tier A: a feature with that
  `NAME` in the snapshot `pickBorders` chooses for the date). For `battle`/`event` items whose `wiki` is not an
  `events.json` article title (array index 6), `console.warn` (do not fail).
- [ ] **Step 2:** Point `index.json` at a missing file → `npm --prefix C:/Users/Benjamen/Projects/history-globe run check:tours` FAILS naming the file.
- [ ] **Step 3:** Add `sample.json` and its index entry; same command → PASS.
- [ ] **Step 4:** Commit `Tours: sample tour and data check`.

### Task 3: Globe tour map state

**Files:**
- Modify: `src/globe.ts`

**Interfaces:**
- Produces (methods on `Globe`):
  - `setBlocs(colours: Map<number | string, string>)` — feature id → colour, via feature-state `bloc`; a new
    `borders-bloc` fill layer above `borders-fill` uses `['coalesce', ['feature-state', 'bloc'], 'rgba(0,0,0,0)']`
    at about 0.55 opacity. Empty map clears.
  - `setHighlight(ids: (number | string)[])` — persistent gold outline (feature-state `hl`, reuse the flash line
    style in a `borders-hl` layer). Empty clears.
  - `setArrows(arrows: Arrow[])` — GeoJSON source `tour-arrows`: great-circle-ish line (MapLibre draws geodesic on
    globe; sample 32 points with linear lng/lat interpolation for flat view) + arrowhead symbol at `to` + `label`
    text at the midpoint. Empty clears.
  - `onArrow(cb: (id: string) => void)` — click/tap on an arrow line (8 px hit tolerance) calls `cb`; runs before
    the polity pick so the card does not open underneath.
  - `setFlat(flat: boolean)` — `map.setProjection({ type: flat ? 'mercator' : 'globe' })`.
  - `clearTour()` — all four of the above off.
  - Feature-states must survive `show(pick)` reloading the borders source: `show` must not be awaited-then-state
    lost; the caller (Task 4) re-applies blocs/highlight after each `show` resolves.
- [ ] **Step 1:** Implement the methods; keep layer order: fill < bloc < line < hl < flash < labels < arrows.
- [ ] **Step 2:** Expose nothing new on `window.hg` beyond `globe` (already there).
- [ ] **Step 3:** `npx tsc -p ...` clean, `npm --prefix ... test` passes. Visual check is in Task 5.
- [ ] **Step 4:** Commit `Globe: bloc shading, highlight, arrows, flat view`.

### Task 4: Tour panel UI and main wiring

**Files:**
- Create: `src/tour-panel.ts`
- Modify: `src/sheet.ts` (`View` gains `'tour'`), `index.html` (menu item `#tours-btn` "Tours" above Share; view
  container `#view-tour` beside `#view-search`), `src/main.ts`, `src/panel.ts` (optional back link), `src/style.css`
- Test: `tests/tours.test.ts` (add hash-start cases), checks in Task 5

**Interfaces:**
- Consumes: Task 1 types/helpers, Task 3 Globe methods, `Sheet.view`, `Sheet.set`.
- Produces:
  - `class TourPanel { constructor(el: HTMLElement, cb: TourCallbacks); showIndex(list: TourIndexEntry[]): void;
    showTour(t: Tour, current?: string): void; showStop(t: Tour, id: string): void; showArrow(t: Tour, a: Arrow): void }`
  - `interface TourCallbacks { open(id: string): void; go(stopId: string): void; exit(): void; back(): void }`
  - In `main.ts`: `tourState: { tour: Tour; stop: string } | null`, `applyStop(t, id)`, `exitTour()`.

- [ ] **Step 1: UI.** `TourPanel` renders (all into `#view-tour`):
  - index: rows (title, years, summary, "N stops");
  - tour: header (title, ✕), bloc legend when the tour has blocs, collapsible sections (open = current), each with
    item rows (kind icon: ⚔ battle, ● event, ◆ player, ⇄ alliances, ¶ text), current row marked `aria-current`;
  - stop detail: "◀ Sections", title, `when` (or formatted date), precision line, text paragraphs (split on blank
    lines), "Read more on Wikipedia" link when `wiki`, ◀ / ▶ (disabled at ends) with "n / total";
  - arrow detail: label, text, Wikipedia link, "◀ Back".
  Text is set with `textContent` (no HTML from JSON).
- [ ] **Step 2: Apply a stop** (`applyStop`): stop playback; set `tourState`; `date = normalize(parseDate(stop.date))`;
  call `render(false, true)` directly (not `setDate`, which exits); `globe.setFlat(stop.view === 'flat')`;
  `map.flyTo({ ...camera, padding: current sheet padding, duration: 1200 })`; after `globe.show` resolves **for this
  render's sequence only** (add an `onRendered(seq)` hook or return the seq from `render`), resolve refs with
  `findPlace` and call `setHighlight`, `setBlocs` (from `blocsAt` when `stop.blocs`), `setArrows`; when `highlight`
  is given, skip the automatic change flash/toast. Then `history.replaceState(null, '', tourHash(...))`.
- [ ] **Step 3: Exit and hash.** `writeHash()` returns early (writing the tour hash instead) while `tourState` is
  set. `exitTour()`: `tourState = null`, `globe.clearTour()`, `globe.setFlat(false)`, sheet to peek, `writeHash()`.
  Call `exitTour()` at the top of `setDate` (covers slider, era tabs, Next change, typed date, timeline chips), when
  search opens, and from ✕. Share button: while a tour is open share `SITE + tourHash(...)`, title
  `History Globe · <tour title>`.
- [ ] **Step 4: Cards during a tour.** Tapping a polity or event while `tourState` is set opens the normal card
  (tour map state stays) and the card shows "◀ Back to tour", which calls `showStop` + `sheet.view('tour')` without
  re-applying the camera. Arrow taps (`globe.onArrow`) call `showArrow`.
- [ ] **Step 5: Start from a link.** On load, if `parseTourHash(location.hash)` matches, fetch `tours/index.json`
  and the tour, then `applyStop` (section id or item id; tour id alone = first stop). Unknown tour/item or a fetch
  failure: normal start + toast "Tour not found". Tours load lazily (index on first Tours click), not at startup.
- [ ] **Step 6:** Add a Vitest case: `parseTourHash('#tour=nope/x')` + `findStop` on the sample returns `undefined`
  for `'x'` (the main.ts fallback itself is covered by Task 5).
- [ ] **Step 7:** `npx tsc`, `npm test`, `npm run check:tours` pass. Commit `Tours: panel, apply, exit, links`.

### Task 5: Headless tour check

**Files:**
- Create: `tests/tours-ui-check.mjs` (same pattern as `tests/ui-check.mjs`; dev server on 5174)

- [ ] **Step 1:** Write checks at 390 px and 1280 px:
  - menu has Tours; clicking it shows the index with the sample tour;
  - opening the sample shows sections; tapping item 1 sets the date input to its date and the hash to
    `#tour=sample/<id>`;
  - ▶ three times quickly → date input equals the 4th stop's date and `borders-bloc` feature-states match that
    stop (Review Focus 3);
  - the flat item → `map.getProjection().type === 'mercator'`;
  - with blocs/arrows on, ✕ → projection `globe`, no `bloc`/`hl` feature-states, `tour-arrows` empty, hash matches
    `^#\d` (Review Focus 2);
  - during a tour, click a polity → card shows "Back to tour"; clicking it returns to the same stop (Review Focus 5);
  - dragging the slider during a tour exits it;
  - loading `#tour=nope/x` → toast "Tour not found", no page errors (Review Focus 1);
  - `errors` empty.
- [ ] **Step 2:** Start the dev server (`npm --prefix ... run dev -- --port 5174`, background) and run
  `node tests/tours-ui-check.mjs` → all PASS. Save one 1280 px and one 390 px screenshot (scale 0.5) to the
  scratchpad for the report.
- [ ] **Step 3:** Commit `Tours: headless check`.

### Task 6: Three small tours (draft → Ben review)

**Files:**
- Create: `public/data/tours/rome.json`, `mongols.json`, `ussr.json`; update `index.json`

- [ ] **Step 1:** Research each item against its Wikipedia article (web allowed). Write to the Tone rule.
  - **Fall of Rome** (~4-5 stops, snapshots 300/400/500 AD; highlight `NAME`s that exist in those snapshots).
  - **Mongol Empire** (~5-6 stops, 1200/1279/1300/1400).
  - **Breakup of the USSR** (~6-8 stops, 1989-1992, day-exact, gwcode refs; e.g. Baltic independence, August
    coup, 25 Dec 1991).
  Each item: precision is shown automatically; text 60-150 words.
- [ ] **Step 2:** `npm run check:tours` passes; open each tour in the dev server once.
- [ ] **Step 3:** Commit `Tours: Rome, Mongols, USSR (draft)`. **Stop and send Ben the text** (a readable
  Markdown export of the three tours in the scratchpad, sent with SendUserFile). Apply his edits, re-run the check,
  commit `Tours: small tours after review`.

### Task 7: World War I tour (draft → Ben review)

**Files:**
- Create: `public/data/tours/ww1.json`; update `index.json`; delete `sample.json` and its index entry (point
  `tests/tours-ui-check.mjs` at `ww1` instead)

- [ ] **Step 1:** Write `ww1.json`: title "World War I", years "1886–1923". Sections: Causes; 1914; Stalemate
  1915–16; 1917; 1918; The peace and new borders 1919–23. Appendix A texts are used verbatim for their items.
  - `blocs`: Entente / Allies and Central Powers, members by gwcode with join/leave dates (verify each against
    Wikipedia: e.g. Ottoman Empire Nov 1914, Italy 23 May 1915, Bulgaria Oct 1915, Romania Aug 1916, USA 6 Apr 1917,
    Russia leaves 3 Mar 1918).
  - `arrows`: Dual Alliance 1879, Triple Alliance 1882, Franco-Russian 1894, Entente Cordiale 1904, Anglo-Russian
    1907, plus others where useful. Map dates no earlier than 1886.
  - 15-20 curated battles referencing `events.json` article titles; `view: "flat"` for Western Front items.
  - At least one `alliances` item per period where membership changed.
- [ ] **Step 2:** `npm run check:tours` (no FAIL; review WARNs), `node tests/tours-ui-check.mjs` passes.
- [ ] **Step 3:** Commit `Tours: World War I (draft)`. **Stop and send Ben the text** (Markdown export). Apply
  edits, re-run checks, commit `Tours: World War I after review`.

### Task 8: Docs and release 0.6.0

**Files:**
- Modify: `src/about.ts` (one line: tours are original text; facts checked against the linked Wikipedia
  articles), `CLAUDE.md` (layout line for `tours.ts`, `tour-panel.ts`, `public/data/tours/`, `check:tours`),
  `docs/next.md`, `docs/roadmap.md` (tick tours; note the empires and WWII tours and the suggestion box as next)

- [ ] **Step 1:** Make the doc edits; `npx tsc`, `npm test`, `npm run check:tours`, `node tests/tours-ui-check.mjs`
  and `node tests/ui-check.mjs` all pass.
- [ ] **Step 2:** Commit `Docs: tours`.
- [ ] **Step 3:** Run the `hg-release` skill for **0.6.0** (minor). New/Fixes notes in Ben's words: guided tours
  (World War I, Fall of Rome, Mongol Empire, Breakup of the USSR) with alliance shading, treaty arrows and a flat
  map view. Report the release link and what was not tested on a real phone (tour panel at half height, arrow
  taps, flat view on a phone, Back to tour).
