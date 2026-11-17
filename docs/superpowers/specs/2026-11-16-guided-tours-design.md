# Guided tours (0.6.0): design

Agreed with Ben 2026-11-16.

## Intent
Ben wants a shiny 0.6.0 to show a friend, and tours are the most impressive way to show what the globe can do. A
tour is a guided, sectioned walk through a period: tap an item and the globe sets the date, moves the camera,
highlights what matters and explains it, with Wikipedia links for more. Phone testing comes later.

## Goals
- Tours menu item -> tour selector -> a tour panel with **sections**, each holding **items** (battles, events,
  players, explainers). Tapping an item sets date + camera (+ optional highlight, shading, arrows, flat view) and
  shows its text and a Wikipedia link.
- An **alliances explainer** item type: countries shaded by bloc for the item's date, plus arrows between capitals
  for treaties; tapping an arrow shows its text and links its Wikipedia article.
- Optional **flat (top-down) view** per item.
- Share link straight into a tour item.
- Four tours: three small (Fall of Rome, Mongol Empire, Breakup of the USSR) and one large (World War I).

## Non-goals (later, maybe)
- Suggestion box (Google Form vs GitHub issues not decided).
- Autoplay / timed playback (Ben chose step-through).
- Tours for European empires 1886-1975 and WWII (data supports them; next release).
- Compare-two-dates view, a tour editor, translations.

## Anti-goals (failure even if it works)
- Text that shoehorns ideology: no flourishes or sentences added for "vibes" (see Tone).
- Unhedged figures or disputed claims stated as fact.
- A tour that leaves the app in a broken state (projection, shading, filters, padding not restored on exit).
- Any runtime call to another site (the artifact blocks them). Links that open Wikipedia in a new tab are fine.

## Tone (rule for all tour text)
Explain causes concretely and plainly. Use material causes (economic, imperial, territorial, demographic) where
they are the real explanation, and individuals and diplomacy as the decisions made within those conditions. Argue
the explanation directly; do not label it as a school ("Marxist") or attribute it to one group's view. No
flourishes, no sentences that exist only to make a point, no focus on any one class unless it is the subject.
Hedge figures ("about 700,000"), word disputed claims as claims ("Falkenhayn later claimed"), and say how precise
the borders are wherever a date is shown (e.g. "Borders from a 400 AD snapshot").

Agreed samples (WWI tour): see Appendix A. Write all tour text to this standard.

## Approaches considered
- **Playback:** step-through panel (picked) vs autoplay with timed captions (cinematic but hard to time and pause).
- **Tour data:** one hand-written JSON file per tour in `public/data/tours/` (picked; easy to edit, matches the rest
  of the data, packaged into the artifact) vs tours in TypeScript.
- **Top-down view:** switch MapLibre's projection (`setProjection({ type: 'mercator' })`) per item (picked; small)
  vs a separate 2D map (large, duplicates layers).
- **Date between items:** jump (picked; the slider already hides dots while moving) vs animate the date.

## Decided design
### UI flow
- Top-bar menu gets **Tours**. It opens the selector inside the existing sheet (phone: bottom sheet; wide screens:
  the right-hand card), as a new sheet view next to `card` and `search` (`src/sheet.ts` `View`).
- Selector: one row per tour (title, years, one-line summary, item count).
- Tour panel: title, ✕, collapsible sections; each section has a short intro (shown when the section opens, and its
  map state is applied) and its items. Tapping an item shows its detail in the same panel with **◀ Back to
  sections**, plus **◀ / ▶** to move to the previous/next item across sections. Current item is marked in the list.
- Item detail: title, date line with border precision, text (a few short paragraphs at most), "Read more on
  Wikipedia" link.
- Exit: ✕, changing the date by hand, or searching. Exit clears shading, arrows and highlight, restores the globe
  projection and normal overlays, and closes the panel.
- Share: `#tour=<tourId>/<itemId>` opens that item (section intro if `itemId` is a section id). The Share button
  in the menu shares the current tour item while a tour is open.

### Item types
- `event` / `battle`: may reference an `events.json` entry by its Wikipedia article title (coordinates, date and
  link come from there; the builder must check each one exists) or give its own.
- `player`: a country, empire, movement or person; highlights its polity where it has one.
- `alliances`: bloc shading for its date plus treaty arrows (below).
- `text`: plain explainer, no special map state.

### Per item (and section intro) map state
`date` (HDate string), `camera` (`center`, `zoom`, optional `bearing`/`pitch`), optional `view: "flat"`, optional
`highlight` (polities outlined gold, overriding the automatic change outline, which shows nothing above 12
changes), optional `blocs` reference, optional `arrows` list. Events/early-human overlays follow the app's usual
rules unless the item says otherwise.

### Polity references
Tier B dates (1886-2019): CShapes `gwcode`. Tier A dates: snapshot `NAME`. Same convention as share links.

### Alliances
- Each tour may define `blocs`: `{ id, name, color, members: [{ ref, from, to? }] }`. Membership is by date, so
  shading follows the item's date (Italy joins the Entente 1915, Bulgaria the Central Powers 1915, Romania 1916,
  the US 1917, Russia leaves 1918). Neutral = unshaded. Legend in the panel.
- Arrows: `{ from: [lng,lat], to: [lng,lat], label, text, wiki }`, drawn as lines between capitals; tapping one
  shows its text and Wikipedia link in the panel.

### Tours (content)
- **World War I, 1886-1923** (large, about 6 sections, 40 to 60 items): Causes (alliances, imperial rivalry, naval
  race, Balkans; map dates from 1886, earlier causes in text only), 1914, Stalemate 1915-16, 1917, 1918, The peace
  and new borders 1919-23. About 15 to 20 curated major battles, not all 410 in `events.json`. One or more
  alliances items. Flat view for Western Front items.
- **Fall of Rome** (about 4 items; tier A snapshots 300/400/500 AD).
- **Mongol Empire** (about 5 items; snapshots 1200/1279/1300/1400).
- **Breakup of the USSR, 1989-1992** (about 6 items; day-exact CShapes).

### Data and licences
Tour text is our own writing. Add an About panel line for tours; `LICENSES.md` needs no new data source unless one
is added. New files must be in the artifact package (`pipeline/artifact.mjs`, `files.json`).

### Checks
Unit tests: tour JSON loading/validation (every item has date, camera, text; refs exist; bloc dates valid), share
link parsing. A headless check (style of `tests/ui-check.mjs`) that opens a tour, steps through items, toggles the
flat view and exits cleanly. Release as 0.6.0 via `hg-release`.

## Review checkpoints (Ben decided)
Ben reads the tour text before release. Order: build the engine with one placeholder tour; then draft the three
small tours and send them to Ben; apply his edits; then draft WWI and send it; apply edits; then release 0.6.0.

## Calls made after the builder check (Claude's, Ben can override)
- **Hash:** while a tour is open the hash is only `#tour=<tourId>/<itemId>`; tour mode suppresses the normal
  `writeHash()` on `moveend`. Exiting restores the normal `#date/lng,lat,zoom/place` hash from the current date
  and camera.
- **WWI item count:** 40-60 is a target, not a floor. Quality and accuracy win; ship with fewer (no fewer than
  about 30) rather than pad.
- **Sources:** web research is allowed at build time. Check every fact and figure against the item's linked
  Wikipedia article (and its cited sources where the article is unclear); the `wiki` link is the item's source, so
  no separate citation field.

## Left to the builder
Exact JSON schema field names, arrow styling (line, dash, arrowhead), bloc colours (readable in both themes, not
gold, which is the highlight), panel CSS, how section intros and items are stored, and the precise item list and
wording within the rules above.

## Appendix A: agreed sample text
**The outbreak of WWI** — By 1914 the great powers had divided most of Africa and Asia between them. Germany's
industry had overtaken Britain's, but its empire was small, and its attempts to expand, in Morocco in 1905 and
1911 and in a naval race with Britain, pushed Britain closer to France and Russia. Austria-Hungary, ruling a dozen
nationalities, saw Serbia's support for South Slav nationalism as a threat to its existence. When a Bosnian Serb
student killed Archduke Franz Ferdinand on 28 June, Vienna saw a chance to crush Serbia, and Kaiser Wilhelm
promised Germany's backing on 5 July. Russia mobilised to support Serbia. Germany's war plan assumed a two-front
war and called for defeating France quickly, through Belgium, before Russia's larger but slower army was ready.
So once Russia mobilised, Germany declared war on Russia and France within days, and Britain entered when Belgium
was invaded.

**Franco-Russian Alliance (1894)** — After losing to Germany in 1871, France was isolated. In 1890 Germany let its
secret treaty with Russia lapse, leaving Russia without a partner too. Despite having opposite political systems,
a republic and an autocracy, the two agreed in 1894 that each would fight if Germany attacked the other. French
loans to Russia helped tie the alliance together. It meant Germany now faced the prospect of a war on two fronts.

**Verdun (21 Feb - 18 Dec 1916)** — Germany attacked the fortress city of Verdun, which France would defend at
almost any cost. Falkenhayn later claimed his aim was to wear down the French army rather than capture the city.
Both sides poured in men and artillery for ten months. About 700,000 were killed or wounded, and the front ended
close to where it began. Britain's offensive on the Somme in July was launched partly to relieve the pressure on
Verdun.
