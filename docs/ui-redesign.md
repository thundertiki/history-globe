# UI redesign: time bar plus one bottom sheet (spec, 2026-11-07, awaiting Ben's review)

## Why
On a 390 px phone the top bar (four text buttons), the info card and the date bar cover over half the map; "Next
change" sits at the end of a scrolling tab row and is hard to find; the Layers menu has two unrelated checkboxes.
Ben wants one holistic layout where exploring time, looking things up and (later) guided learning all get the space
they need ("all equal"). Success: every control is reachable without sideways scrolling, the map stays the star, and
tours and quizzes can be added without new chrome.

## Layout (phone, up to 640 px wide)
- **Top bar:** title left; Search icon and a ⋯ menu right. ⋯ holds Share, Support (Ko-fi), About. No text buttons.
- **Date bar** (always visible), two rows plus slider:
  - Row 1: play, ‹, date, ›, **Next change ▸** (accent-outlined; takes the old speed button's place).
  - Row 2: six era tabs sized to fit one row, no scrolling: Pre, Ancient, Medieval, 1500s, 1800s, 1945+. The
    slider's end labels keep the exact years (e.g. 1800 / 1945). Full names stay in `aria-label`s.
  - Speed (1x/3x/10x): long-press on play cycles it and shows a toast ("Speed 3x"). Tap still plays/pauses.
- **Bottom sheet** above the date bar, one component for everything that is not the map:
  - Heights: **peek** (one line: "Tap a country, or search"), **half** (card), **full** (search results, later
    tours and quizzes). Drag the handle to change height; the close button returns to peek.
  - Tapping a country, event or site opens the card at half height. Search opens at full; choosing a result
    jumps there and settles at half with its card (existing `goTo`).
- **Map follows the sheet:** when the sheet is above peek, the map gets bottom padding equal to the sheet height
  and zooms out slightly, so the globe stays centred in the visible area (`easeTo` with `padding`; replaces
  `revealAbove`). Closing the sheet restores padding and zoom.

## Overlays instead of "Layers"
- Remove the Layers menu.
- **Events toggle:** one icon button on the map (bottom right, above the zoom buttons) for battles, treaties and
  cities. Persisted per device as today (`hg-layers`, `events` only).
- **Early humans:** always shown while the date is before AD 1500; no toggle (it is content for that era, not a
  layer). Drop the `human` key from stored settings.
- Later overlays (wars, cities) get their own toggles next to Events; bring "Layers" back only if there are more
  than about three.

## Desktop (wider than 640 px)
Keep the card as the right-hand panel and the same two-row date bar; the sheet's drag behaviour and map padding
are phone-only. Top bar is the same (Search, ⋯).

## Not changing
Data, event dots, the change outline, era logic, search ranking, share links.

## Files likely touched
`index.html`, `src/style.css`, `src/main.ts` (menu, tabs, sheet, long-press, padding), `src/panel.ts` (render into
the sheet), `src/globe.ts` (events toggle only), `tests/` (new check). The Layers code in `main.ts` goes away.

## Testing
Headless Edge at 390 px and 1280 px (`tests/*-check.mjs` pattern): all six era tabs visible without scrolling;
Next change visible and working; ⋯ opens its menu; Events toggle hides the dots; with the sheet at half, the
map centre point is inside the visible area; early-human sites appear before 1500 with no toggle. Ben checks it on
his phone before release. Existing checks (`e2e`, `search`, `changes`, `eras`, `rulers`) must still pass, with
selectors updated where controls moved.

## Open questions
- Speed on long-press may be too hidden; fallback is a small "1x" label under the play button.
- Exact peek/half/full heights are tuned on a real phone.
