# Final Whole-Branch Review Fix Report

Date: 2026-08-02 (Asia/Shanghai)

Branch: `codex/menu-art-assets`

Starting commit: `51354f7`

## Result

PASS — all seven final-review findings are implemented, regression-covered, exercised in Microsoft Edge with trusted pointer input, visually inspected at 1440×810 and 844×390, and included in the complete asset/test/build gate.

## Findings resolved

1. **Day 5 celebrity is a live, required order.** Closing the event dispatches an idempotent celebrity injection into an unbound lane, preserving both occupied-slot bindings. The actor, name, signature recipe, mild modifier, and order ID are rendered in the live customer lane. Day 5 completion now requires both the normal target and `celebrityServed`; delivery is the only path that sets that flag.
2. **Modifiers are populated, shown, and enforced.** Initial and replacement orders use deterministic Day 2–6 modifier cycles. Compact ingredient/heat chips appear in customer bubbles. Slots snapshot the bound order's modifiers, and every placement/gesture step is resolved from its effective recipe, including extras, omissions, mild spice, and hot chili.
3. **Stage art is compositable.** The 49 cumulative images and 44 heat variants are now RGBA food overlays. All corners are transparent, all five empty stages are fully transparent, and every non-empty stage is at least 30% transparent. Runtime images use `object-fit: contain`, so the approved counter remains the only griddle surface.
4. **Short landscape campaign screens fit.** Home, select, event, and summary have dedicated compact rules for 844×390. The level grid uses three columns; summary content and actions remain in-frame.
5. **Cut progress stores identity.** Each slot persists sorted unique `cutTargetIndices`. Duplicate target gestures are rejected and cannot unlock roll; three different horizontal targets are required and visibly marked.
6. **Tutorials demonstrate recognizer-valid gestures.** Sauce uses a 6×10 serpentine, cut uses the next missing 70%-width horizontal target, and roll uses an 80%-width low-deviation swipe. The rendered SVG paths are the same data used by recognizer tests.
7. **Sauce uses a real brush interaction.** The draggable sauce ghost was removed. The tabletop brush must be selected before a sauce gesture target becomes active; successful coverage clears the tool while unsuccessful/cancelled attempts remain retryable.

## TDD evidence

The focused regression suite was written and run before implementation. The RED run failed at the intended seams: modifiers were empty, celebrity injection/progress modules were absent, cut identity was not stored, tutorial paths were absent, sauce remained a draggable fixture, and the short-screen CSS contract was missing. Twenty-eight unrelated assertions remained green.

After implementation:

```text
Focused regression run
Test Files  10 passed (10)
Tests       79 passed (79)

Reducer + mounted scene confirmation
Test Files  2 passed (2)
Tests       30 passed (30)

Complete suite
Test Files  18 passed (18)
Tests       117 passed (117)
```

Key regressions are in:

- `src/landscape/campaign.test.ts`
- `src/landscape/kitchen/queue.test.ts`
- `src/landscape/kitchen/reducer.test.ts`
- `src/landscape/kitchen/service.test.ts`
- `src/landscape/kitchen/state.test.ts`
- `src/landscape/kitchen/tutorialPaths.test.ts`
- `src/components/game/KitchenScene.test.tsx`
- `src/styles/kitchen-layout.test.ts`
- `src/App.test.tsx`

## Asset pipeline and verification

`tools/stage_art/extract_food_alpha.py` deterministically derives masks without redrawing the approved art. Cumulative stages are differenced from their recipe's empty plate; each heat checkpoint shares one aligned alpha envelope across raw/ready/scorched/burnt. The script modifies alpha only, reopens every output, and asserts byte-for-byte RGB identity.

```text
Extracted 49 cumulative and 44 heat RGBA cutouts;
non-empty transparency range 0.4420..0.7963; RGB preserved

Kitchen art assets complete
(174 PNGs; 49 cumulative + 44 heat alpha cutouts)
```

The verifier now decodes PNG scanlines itself and rejects non-RGBA/interlaced files, opaque corners, visible empty stages, fully transparent food, and non-empty images with less than 30% transparent area.

Visual inspection of `docs/qa/screenshots/final-fixes/stage-alpha-contact-sheet.png` passed: empty cells are transparent, food/roll/bag silhouettes are isolated, heat variants remain aligned, and no nested griddle panels remain.

## Real-browser acceptance

`node scripts/final-fixes-browser-qa.mjs` launched the Vite app and Microsoft Edge headlessly, then used trusted DevTools mouse/touch packets. Result: 6 checks passed and 0 app runtime errors.

- 844×390 home fits with every visible action in-frame and zero document overflow.
- A real click completes home → select; all six day cards and upgrade controls fit with zero document overflow.
- 844×390 Day 5 event and summary fixtures fit with all actions in-frame and zero document overflow.
- Closing the event creates a live celebrity whose actor/bubble share `order-celebrity-3`, name is 林奕辰先生, recipe is 招牌芝士火鸡烤冷面, and heat preference is `mild`.
- A complete live celebrity order was prepared with real drags/clicks, a trusted touch sauce swipe, three distinct mouse cuts, roll, tray movement, and customer delivery. Repeating cut target 0 left progress at one.
- Day 6 showed extra/without/hot/mild/normal modifier chips. Two simultaneous stage overlays loaded using `object-fit: contain` at both target viewports.

Evidence:

- `docs/qa/screenshots/final-fixes/browser-qa-results.json`
- `docs/qa/screenshots/final-fixes/day5-celebrity-live-1440x810.png`
- `docs/qa/screenshots/final-fixes/two-slots-1440x810.png`
- `docs/qa/screenshots/final-fixes/two-slots-844x390.png`
- `docs/qa/screenshots/final-fixes/narrow-home-844x390.png`
- `docs/qa/screenshots/final-fixes/narrow-select-844x390.png`
- `docs/qa/screenshots/final-fixes/narrow-event-844x390.png`
- `docs/qa/screenshots/final-fixes/narrow-summary-844x390.png`

The browser requested the repository's absent `/favicon.ico` three times. The harness records those known browser-resource 404s separately; there were no application exceptions or other error-level resources.

## Final gate

Run from `D:\game_demo`:

```powershell
node scripts/verify-kitchen-assets.mjs && npm test && npm run build
```

Final result:

- Asset verifier: PASS, 174 total PNGs / 49 cumulative / 44 heat alpha cutouts.
- Vitest: PASS, 18 files / 117 tests.
- TypeScript + Vite production build: PASS.

## Self-review and scope

- `git diff --check` reports no whitespace errors; only the repository's existing Windows LF→CRLF notices appear.
- Browser screenshots were inspected at original resolution, including both occupied-slot target sizes.
- Alpha conversion is reproducible and RGB-preserving; the verifier covers exact inventory plus compositing constraints.
- The pre-existing user modification in `.superpowers/sdd/task-5-report.md` and unrelated untracked workspace artifacts were intentionally left unstaged and unchanged by this fix wave.
- No remaining product blocker was found. The only known low-priority noise is the absent favicon request documented above.

## Follow-up: celebrity recovery and physical modifier visuals

The remaining whole-branch findings were closed in a second TDD wave on 2026-08-02.

### Runtime fixes

- An unserved celebrity who times out is recreated in the same lane with fresh customer and order IDs. Any occupied slot bound to the expired order is rebound in the same state transition, preserving its recipe, modifiers, completed steps, and heat state. Successful celebrity delivery still exits normally and cannot reinject.
- The celebrity order now visibly and mechanically requires extra egg plus mild heat. Its effective opening sequence is `noodle, egg, egg, turkey-noodle`; both eggs receive independent heat cycles.
- Modifier heat rendering no longer synthesizes missing `unknown-*.png` paths. Exact authored checkpoints use heat art; every unauthored modifier heat combination retains the latest cumulative canonical stage.
- Completed egg, cilantro, onion, chili-powder, bacon, and enoki modifiers render as persistent transparent layers. Without-scallion orders use dedicated physical cut and roll images for all five recipes.

### Mechanical asset pipeline

`tools/stage_art/build_modifier_assets.py` deterministically builds six transparent topping overlays from approved ingredient/stage rasters and ten no-scallion cut/roll variants by masking green garnish and inpainting from neighboring food pixels. `extract_food_alpha.py` excludes the modifier subtree from canonical-stage processing.

The verifier now checks all 190 expected PNGs, validates modifier transparency, and compares every no-scallion file to its canonical source to require a material reduction in green garnish:

```text
Kitchen art assets complete
(190 PNGs; 49 cumulative + 44 heat + 6 topping + 10 no-scallion cutouts)
```

### Regression and browser evidence

The focused RED run failed 9 new assertions at the intended old seams. After implementation, the focused five-file run passed 61/61; the expanded asset manifest suite passed 11/11.

The final Microsoft Edge run passed 8 checks with 0 application runtime errors. It used trusted mouse/touch input to prove timeout → fresh celebrity → occupied-slot rebind → two egg heat cycles → service → Day 5 completion, plus Day 4 bacon raw/ready and Day 6 enoki/no-scallion cut/roll rendering. Original-resolution screenshots were visually inspected.

Final gate:

```text
Asset verifier  PASS (190 PNGs)
Vitest          PASS (18 files, 127 tests)
Production build PASS
Edge QA         PASS (8 checks, 0 runtime errors)
```

Evidence is retained in `docs/qa/screenshots/final-fixes/browser-qa-results.json` and the new `day4-bacon-*`, `day5-celebrity-*`, `day6-enoki-*`, and `day6-no-scallion-*` captures.

### Final P2 correction

A focused regression now covers Day 6 signature + bacon after cheese and corn. Both bacon `raw` and `ready` retain `signature-05-corn.png` as their base and keep the bacon overlay, rather than regressing to the older turkey-noodle heat checkpoint. The final gate remains green at 190 verified PNGs, 18 test files / 127 tests, and a successful production build.

### Minor 3 — derivative reproducibility

The accepted kitchen inpaint is now tracked at `src/assets/art-source/kitchen-live-inpaint-source.png`; `build-live-kitchen-plate.mjs` no longer reads the ignored `artifacts/` tree. The builder is importable without writing its production output and remains executable as a CLI.

TDD evidence:

```text
RED   npx vitest run scripts/art-remake/build-live-kitchen-plate.test.mjs
      FAIL: buildLiveKitchenPlate is not a function
GREEN npx vitest run scripts/art-remake/build-live-kitchen-plate.test.mjs
      PASS: 1 test
```

The focused regression hashes the tracked source (`3c7046b8a5a4736ad79c414dfaf3819930095fa3bc61b1c2f95affe5dac5084c`) and asserts a temporary rebuild is byte-for-byte identical to the tracked live plate.
