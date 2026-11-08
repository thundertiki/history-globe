# UI redesign implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the time bar plus one bottom sheet layout from the spec, in three independently shippable tasks.

**Architecture:** Plain TypeScript and CSS, no framework. Task 1 reworks the date bar, Task 2 the top bar and overlay toggles, Task 3 adds a `Sheet` class that the card and search share and that drives map padding. Existing `Panel` rendering and `goTo` stay.

**Tech Stack:** Vite, TypeScript, MapLibre GL 5, Vitest, headless Edge via `playwright-core` (`tests/*-check.mjs`).

**Spec:** `docs/ui-redesign.md`

## Global Constraints
- Phone layout applies at `max-width: 640px` (the existing breakpoint); wider screens keep the right-hand card.
- Era tab labels: Pre, Ancient, Medieval, 1500s, 1800s, 1945+ (full names in `aria-label`). Slider end labels keep exact years.
- Sentence case, no terminal punctuation on labels. Ko-fi link: `https://ko-fi.com/J2Y62A9SV0`.
- No runtime calls to other sites. Never use JS `Date` before 1900. Edit files with the Edit tool, not heredocs with apostrophes.
- Existing checks (`npm test`, `tests/e2e-check.mjs`, `search-check`, `changes-check`, `eras-check`, `rulers-check`) must still pass, with selectors updated where controls moved. Run checks with `npm run dev -- --port 5174` running; stop only that PID afterwards.

## Review Focus
- Very narrow phone (320 px): six tabs plus five row-1 controls must not overflow or scroll sideways.
- Long-press on play must not also toggle play/pause, and a normal tap must still toggle it.
- Opening the sheet then changing date or tapping empty ocean must leave padding and zoom restored, not stuck.
- Old `hg-layers` localStorage with `human: false` must not hide early-human sites.
- Dragging the sheet handle must not pan the map underneath; Escape and the close button return to peek.

---

### Task 1: Date bar (tabs fit, Next change in row 1, speed on long-press)

**Files:** Modify `index.html`, `src/style.css`, `src/timeline.ts` (add `short` to `ERAS`), `src/main.ts`; update `tests/eras-check.mjs`.

**Interfaces:**
- Produces: `ERAS: { label: string; short: string; start: number }[]` (short = Pre, Ancient, Medieval, 1500s, 1800s, 1945+); `#next-change` button in `.timebar .row`; `#speed` button removed.

- [ ] **Step 1: Update `tests/eras-check.mjs`** to assert: all six `.era` buttons have `scrollWidth <= clientWidth` of `#eras` at 320 px and 390 px viewports; `#next-change` is inside the first `.timebar .row`; clicking it changes the date; no `#speed` element. Run it: expect FAIL.
- [ ] **Step 2: Move Next change.** In `index.html` replace `#speed` with `<button id="next-change" class="hi" aria-label="Next change">Next ▸</button>`; in `main.ts` drop the dynamically created `nextBtn` from the era row and bind its existing click handler to `$('next-change')`. Add `short` to `ERAS` and use it for tab text with `aria-label=label`.
- [ ] **Step 3: Fit the tabs.** In `style.css` make `.eras` a non-scrolling flex row with equal-width `.era` (`flex: 1; min-width: 0; padding: 4px 2px; font-size: 12px`); remove the `.era.change` rule.
- [ ] **Step 4: Speed on long-press.** In `main.ts`, `#play` gets `pointerdown` (start a 500 ms timer) and `pointerup`/`pointerleave` (clear it). When the timer fires: cycle `speed` through `SPEEDS`, `showToast(\`Speed ${SPEEDS[speed]}×\`)`, set a `longPressed` flag; the `click` handler returns early (and clears the flag) when `longPressed`.
- [ ] **Step 5: Run** `npm test`, `npx tsc --noEmit`, `node tests/eras-check.mjs`, `node tests/changes-check.mjs`. Expected: all PASS. Screenshot at 390 px (scale 0.5) and look at it.
- [ ] **Step 6: Commit** "Date bar: tabs fit one row, Next change beside the arrows, speed on long-press".

### Task 2: Top bar, ⋯ menu, Events toggle

**Files:** Modify `index.html`, `src/style.css`, `src/main.ts`, `src/about.ts` (no change expected); update `tests/search-check.mjs`; create `tests/ui-check.mjs`.

**Interfaces:**
- Produces: `#search-btn` (icon, `aria-label="Search"`), `#more-btn` and `#more-menu` (contains the existing `#share-btn`, a Support link to Ko-fi, and the existing `#about-btn`); `#events-btn` (map button, `aria-pressed`); `layers` object becomes `{ events: boolean }` and `human` overlay is always on.
- Consumes: `globe.updateOverlays(t, window, show: { events: boolean; human: boolean })` unchanged; call it with `human: true`.

- [ ] **Step 1: Write `tests/ui-check.mjs`** (390 px): `#layers-btn` and `#layers` do not exist; clicking `#more-btn` reveals `#share-btn`, `#about-btn` and a link to `ko-fi.com`; clicking `#events-btn` flips `aria-pressed` and hides event dots (`hg.globe.map.getFilter('events')` is the false filter); at date `-50000` an early-human site is visible regardless of stored `hg-layers={"human":false}` (set via `localStorage` before load). Run: expect FAIL.
- [ ] **Step 2: Top bar.** Replace the four text buttons with `#search-btn` (Tabler `ti-search` icon, text hidden) and `#more-btn` (`ti-dots`); wrap Share, Support, About in `#more-menu` (hidden popover reusing `.layers` styling, closes on outside click and Escape). Delete the `#layers` block and its handlers in `main.ts` (lines around "Layers menu", `layer-events`, `layer-human`).
- [ ] **Step 3: Events button.** Add `#events-btn` positioned bottom right above the date bar (`bottom: calc(var(--timebar-h, 140px) + 12px); right: 16px`, desktop: above the zoom buttons). It toggles `layers.events`, persists `{ events }` under `hg-layers` (ignore any stored `human`), and calls `refreshOverlays(false)`.
- [ ] **Step 4: Update `tests/search-check.mjs`** only if selectors changed (`#search-btn` stays). Run all checks listed in Global Constraints; expect PASS.
- [ ] **Step 5: Commit** "Top bar with search and menu; Events toggle replaces Layers".

### Task 3: Bottom sheet (shared by card and search) and map padding

**Files:** Create `src/sheet.ts`, `tests/sheet.test.ts`; modify `index.html`, `src/style.css`, `src/main.ts`, `src/panel.ts` (only if it hides/shows the element directly); extend `tests/ui-check.mjs`.

**Interfaces:**
- Produces in `src/sheet.ts`:
  - `export type SheetState = 'peek' | 'half' | 'full'`
  - `export function sheetPadding(state: SheetState, sheetHeight: number, phone: boolean): { top: number; bottom: number; left: number; right: number }` (all zero when `phone` is false or state is `peek`; otherwise `bottom = sheetHeight`, `top = 60`)
  - `export class Sheet { constructor(el: HTMLElement, onChange: (state: SheetState, height: number) => void); state: SheetState; set(state: SheetState): void; view(name: 'card' | 'search'): void }` — drag on `.grab` (pointer events, `touch-action: none`) snaps to the nearest of peek/half/full; `Escape` and `#panel-close` call `set('peek')`.
- Consumes: `Panel` (`show`, `showInfo`, `hide`), `globe.map`, `goTo(r: Result)`.

- [ ] **Step 1: Write `tests/sheet.test.ts`**: `sheetPadding('half', 300, true)` equals `{ top: 60, bottom: 300, left: 0, right: 0 }`; `sheetPadding('peek', 40, true)` and `sheetPadding('half', 300, false)` are all zeros. Run: expect FAIL (module missing).
- [ ] **Step 2: Implement `src/sheet.ts`** per the interface; heights come from CSS (`--sheet-half`, `--sheet-full`), tuned later on a real phone.
- [ ] **Step 3: Markup and CSS.** `#panel` gains a `.grab` handle, `data-sheet` attribute, and two views (`#view-card` containing `#panel-body`, `#view-search` containing the search input and results moved from `#search`). Phone: sheet pinned above the date bar with the three heights; desktop: unchanged right panel, no handle, peek hint hidden. Peek shows "Tap a country, or search".
- [ ] **Step 4: Wire `main.ts`.** Create `Sheet`; `#search-btn` calls `sheet.view('search'); sheet.set('full')`; `goTo` and map taps call `sheet.view('card'); sheet.set('half')`; closing/empty-map tap calls `sheet.set('peek')`. `onChange` stores the zoom on leaving peek, then `map.easeTo({ padding: sheetPadding(...), zoom: Math.max(1, zoom - 0.3), duration: 300 })`; on return to peek restore the saved zoom and zero padding. Remove `revealAbove` use and `releaseMap` in favour of this.
- [ ] **Step 5: Extend `tests/ui-check.mjs`** at 390 px: open a card via `hg.goTo`; assert sheet `data-sheet="half"`, map padding bottom equals the sheet's height, and the map centre projects inside the visible area (`y < sheet.top`); close it and assert padding is 0 and zoom restored. At 1280 px assert no `.grab` is displayed and the card is the right panel. Add drag test: pointer-drag the handle up and assert `data-sheet="full"` while map centre is unchanged.
- [ ] **Step 6: Run** `npm test`, `npx tsc --noEmit`, and every `tests/*-check.mjs`. Expected: PASS. Screenshots at 390 and 1280 (scale 0.5) for both states.
- [ ] **Step 7: Docs and commit.** Update `docs/next.md` (UI redesign done, unreleased), tick it in `docs/roadmap.md`, note the removed Layers menu in `CLAUDE.md` only if it mentions it. Commit "Bottom sheet for card and search; map recentres with the sheet".

### After the tasks
Ben checks the phone layout (sheet heights, long-press speed, 320 px width). Then release as 0.5.0 with `hg-release`.
