# Release Fix Wave 2 Report

## Status

PASS — all binding Release Fix Wave 2 findings are resolved locally. No push was performed.

## RED / GREEN evidence

- RED: `npm test -- --run src/components/game/KitchenScene.test.tsx`
  - 43 tests total: 40 passed, 3 failed.
  - The failures reproduced both mouse/touch sauce-bin generic placement and the Big Eater second-noodle keyboard route.
- GREEN: `npm test -- --run src/components/game/KitchenScene.test.tsx src/landscape/kitchen/service.test.ts src/landscape/kitchen/griddle.test.ts`
  - 3 files / 63 tests passed.
- Controller confirmation: `npm test -- --run src/components/game/KitchenScene.test.tsx`
  - 1 file / 43 tests passed.

## Fixes

- Sauce remains visible as the approved complete `ingredient-bin-sauce.png` metal bin.
- Sauce-bin pointer tap, click and drag now only activate the sauce tool. They never dispatch generic `DROP_INGREDIENT` and never complete sauce.
- Existing service logic still requires two accepted sauce gestures: after the first stroke sauce remains incomplete at `1/2`; after the second it completes at `2/2`.
- Keyboard routing now uses `ingredientForCookingStep()`, including `second-noodle -> noodle` and `second-egg -> egg`. Enter/Space coverage exercises both first and second noodle/egg placements.
- The Unicode sauce brush was removed. The pointer cue now uses the approved sauce-bin raster.
- Task 8's original-detail notes consistently state Day 1/3/5 = 5/11/15 complete bins including sauce; obsolete 10/14 plus brush wording was removed.
- The checked-in Edge runner now records `completeBinCount`, validates all three fixture keys and exact day/count pairs before writing successful evidence.

## Automated gates

- `npm run validate:art` — PASS, 426 assets across 5 families.
- `npm test -- --run` — PASS, 37 files / 244 tests.
- `npm run build` — PASS, TypeScript and Vite production build.
- `git diff --check` — PASS.

## Microsoft Edge acceptance

- Command: `node scripts/current-reference-screens-qa.mjs`
- Result: PASS in Microsoft Edge at 1440×810 in 103 seconds.
- Three actual Day 1 orders were completed through real interactions.
- Audio rejected-start retry, singleton resume/continuity and seven lifecycle checkpoints passed.
- Fresh progression fixtures in `artifacts/reference-screens-qa/result.json`:
  - `day1`: exact day 1, 5 complete bins.
  - `day3`: exact day 3, 11 complete bins.
  - `day5`: exact day 5, 15 complete bins.
- Console errors: 0. Page errors: 0.

## Original-detail inspection

All eight freshly generated 1440×810 screenshots were inspected at original detail. Home, settings, day select, guided Day 1, summary, Day 2 transition, Day 3 and Day 5 are readable and unclipped. Ingredient assets are recognizable complete metal bins, including the sauce bin. Fixture counts and customer/order composition match their requested days.

## Concerns

No Wave 2 release blocker remains. The expanded Day 5 rack is intentionally dense but stayed within the checked non-overlap and viewport constraints.
