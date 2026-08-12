# Task 3 Report: Complete bins and progressive kitchen layouts

## Status

- Status: COMPLETE
- Baseline: `82b4dd2`
- Branch: `codex/reference-screens-bins-bgm`
- Commit message: `feat: place every ingredient inside a metal bin`

## Implementation

- `src/components/game/TableIngredient.tsx`
  - Removed the nested `.table-ingredient__vessel` and `.table-ingredient__contents` markup.
  - Each ingredient button now owns exactly one direct `.table-ingredient__bin-art` image containing the complete metal bin and food.
  - Preserved pointer capture, the four-pixel drag threshold, mouse/touch/pen drops, egg taps, logical-coordinate ghosts, and cancellation.
  - The drag ghost uses the exact same `art` URL as the visible complete-bin image.
  - Added declared rack index, column, and row data plus CSS variables.
- `src/components/game/KitchenScene.tsx`
  - Removed the Day 1 locked-cilantro exception. Only `availableIngredients(day)` render, so locked ingredients are hidden.
  - Preserved the sauce brush as its own interactive physical slot at rack index 3.
  - Assigned every visible ingredient its stable unlock-order rack index; skipping the brush slot prevents overlap.
- `src/styles/kitchen.css`
  - Added one shared 3-column by 5-row rack contract at the left edge: x `12..320`, y `468..786`, 100x62 controls, 104px column pitch, and 64px row pitch.
  - Removed every ingredient-specific absolute position and every fake-vessel/contents style.
  - Sized complete square PNGs around their transparent margin so the photographed bins stay readable without distorting the art.
  - Positioned the brush with the same rack formula.
- `src/components/game/KitchenScene.test.tsx`
  - Added exact Day 1, Day 3, and Day 5 visible-ID contracts, one direct bin image per button, no legacy wrapper nodes, unique rack cells, complete slot ranges, and same-asset ghost coverage.
  - Updated the tutorial-completion assertion so locked cilantro is absent instead of disabled.
- `src/styles/kitchen-layout.test.ts`
  - Added mathematical coverage for the 3x5 rack bounds, every pair of its 15 cells, both rack consumers, both griddles, the 810px scene edge, and the Day 1 tutorial top edge.
- `src/styles/referenceGameplayComposition.test.ts`
  - Updated the older composition contract to require complete bin art and explicitly forbid the now-retired fake vessel/contents CSS.

## TDD evidence

### RED

Command:

```text
npm test -- --run src/components/game/KitchenScene.test.tsx src/styles/kitchen-layout.test.ts
```

Exact result before implementation:

```text
Test Files  2 failed (2)
Tests       5 failed | 37 passed (42)
```

Expected failures covered the locked Day 1 cilantro, legacy wrapper DOM, missing direct bin-art image, absent rack variables, and the ghost-image identity assertion.

### GREEN

Focused command:

```text
npm test -- --run src/components/game/KitchenScene.test.tsx src/styles/kitchen-layout.test.ts
```

Exact result:

```text
Test Files  2 passed (2)
Tests       42 passed (42)
```

Production build:

```text
npm run build
```

Exact result:

```text
tsc -b && vite build
415 modules transformed
Build completed successfully
```

The first full-suite run exposed one stale pre-Task-3 composition assertion that still required `.table-ingredient__vessel`. After updating that contradictory test to the approved complete-image contract, the final full suite was:

```text
npm test

Test Files  33 passed (33)
Tests       215 passed (215)
```

Whitespace verification:

```text
git diff --check
```

Exact result: PASS, no whitespace errors.

## 1440x810 live screenshot evidence

All screenshots were captured from the live Vite app in headless Edge at a CDP-emulated 1440x810 viewport with device-pixel ratio 1, then inspected at original detail. Machine-readable bounds and overlap results are in `.superpowers/sdd/task-3-screenshots/capture-metadata.json`.

- Day 1: `.superpowers/sdd/task-3-screenshots/day-1-1440x810.png`
  - SHA-256: `44CDEE364FD92D7F90B2A96952B1A48EB86B5006A56F3E742AAB5D97359ACBFB`
  - Four unlocked bins occupy indices 0, 1, 2, and 4; the brush occupies index 3.
  - Live bounds end at y=594, while the guided tutorial begins at y=600.
  - Diagnostic overlaps: ingredient pairs `[]`, brush/ingredients `[]`, griddles `[]`, tutorial `[]`, brush/tutorial `false`.
- Day 3: `.superpowers/sdd/task-3-screenshots/day-3-1440x810.png`
  - SHA-256: `A388095A7B2CF3B6DD83FA642C91102A403391273865E25CCE96DF1447424CEF`
  - Ten unlocked bins plus the brush occupy unique indices 0 through 10 over four rows.
  - Diagnostic overlaps: ingredient pairs `[]`, brush/ingredients `[]`, griddles `[]`.
- Day 5: `.superpowers/sdd/task-3-screenshots/day-5-1440x810.png`
  - SHA-256: `50DB6AE2B4D012C49BC2E1F2743EB0B3FD8DA776AAFAC34A3981A8F175396564`
  - Fourteen unlocked bins plus the brush fill all 15 cells of the 3x5 rack.
  - The last row ends at y=786, inside the 810px logical scene.
  - Diagnostic overlaps: ingredient pairs `[]`, brush/ingredients `[]`, griddles `[]`.

## Visual verdict

- PASS at original detail for Day 1, Day 3, and Day 5.
- Every food control reads as one coherent photographed metal bin; no nested CSS bowl or tray is visible.
- The rack expands progressively downward as ingredients unlock, remains wholly left of the first griddle (rack right 320px; griddle left approximately 491px), and keeps the brush in a dedicated cell.
- Day 1 remains clear of the live guided-tutorial copy with a six-pixel control-bound gap. Day 5 fills the compact rack without clipping or pairwise overlap.
- Drag/tap behavior remains covered by the existing mouse, touch, pen, egg-tap, logical-coordinate, and drop-target tests.

## Concerns

- None.
