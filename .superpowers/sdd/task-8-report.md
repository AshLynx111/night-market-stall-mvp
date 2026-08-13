# Task 8 Report: Reference Screens Final Acceptance

## Status

PASS — deployment candidate accepted locally. No push was performed; the controller owns final review and deployment.

## Automated gates

- `npm run validate:art` — PASS, 426 assets across 5 families.
- `npm test -- --run` — PASS, 36 files / 233 tests.
- `npm run build` — PASS, Vite production build; final bundles `index-CiNLcUtz.js` and `index-BwttfABo.css`.
- `node scripts/current-reference-screens-qa.mjs` — PASS in Microsoft Edge at 1440×810.

## Edge journey

The tracked runner performed this flow:

1. Loaded the approved home plate and confirmed no audio element/autoplay before a trusted gesture.
2. Opened settings; set master/music/effects to 0.62/0.50/0.30; confirmed BGM volume 0.31.
3. Muted and restored BGM, returned home, opened day selection, and confirmed one looped audio element continued past 7 seconds without restart.
4. Entered Day 1 from selection, then ran the complete first-order guided flow: noodle, egg wait, hot dog wait, two sauce strokes, scallion, three cuts, one short right roll, pack, and deliver.
5. Reached the live Day 1 summary, verified dynamic order/satisfaction/mistake/funds values, and entered Day 2.
6. Inspected Day 3 and Day 5 fixture kitchens after all actors arrived.

## Original-detail visual inspection

Evidence is stored at `artifacts/reference-screens-qa/` (ignored local QA evidence) with machine results in `result.json`.

- `01-home.png`: approved plate is fully visible; no clipped edges.
- `02-settings-audio-controls.png`: live range handles align to all three rails and remain readable.
- `03-day-select.png`: plate and dynamic state fit at 1440×810.
- `04-day-1-guided-entry.png`: after correction, tutorial copy is on an opaque card in the empty right customer area; no ingredient/griddle overlap.
- `05-day-1-summary.png`: dynamic values replace baked values cleanly and remain readable.
- `06-next-day.png`: next-day transition reaches Day 2 with a fresh kitchen.
- `07-day-3-all-unlocked-bins.png`: 11 complete ingredient-bin controls, including sauce; all contents recognizable.
- `08-day-5-all-unlocked-bins.png`: 15 complete ingredient-bin controls, including sauce and every Day 5 ingredient.

The runner additionally rejects floating/bare ingredient controls, missing/zero-size bin art, legacy nested vessel UI, bin-to-bin overlap, bin/griddle overlap, bin/tutorial overlap, clipped plate/dynamic masks, baked-customer duplication, order-bubble/face collisions, duplicate audio nodes, inactive mute, and BGM restart on navigation. All checks passed with zero console/page errors.

## Corrections made during acceptance

- Classified `main-ui/kitchen-screen-live-clean.png` as an approved live derivative in the full-art manifest and recorded its source derivation.
- Replaced the stale transparent tutorial-copy placement with an opaque reference-style card positioned away from ingredients and griddles.

## Remaining concern

No release-blocking functional or visual concern was found at the required 1440×810 viewport. The production build is asset-heavy, so initial download size remains a future optimization opportunity; it does not affect this acceptance contract.

## Final review fix-wave addendum

- Replaced the emoji sauce brush with the complete generated sauce metal-bin PNG. Exact complete-bin counts are now Day 1 = 5, Day 3 = 11, Day 5 = 15.
- Added BGM rejected-start retry and paused-singleton resume evidence while preserving identity, loop and time.
- Replaced nearly transparent settings inputs with opaque live rails/thumbs; 0.62/0.50/0.30 produce distinct recorded thumb centers.
- Added keyboard ingredient, sauce/cut/roll, and serving paths plus denied-storage regression coverage.
- Moved the accepted kitchen inpaint source into tracked art-source files and added a byte-for-byte clean-clone rebuild test.
- Final gates: focused 65/65, full 241/241, 426 art assets, production build, and Edge 1440×810 three-delivery journey all PASS.

## Evidence-integrity re-review

The acceptance runner was tightened after review and re-executed successfully:

- Removed `qaServedOrders` from the acceptance path. After the initial home load, the runner does not call `page.goto` until the completed Day 2 checkpoint; it enters Day 1 from the select screen and completes all three required orders with real pointer clicks, drags, cooking waits, sauce strokes, cuts, roll, packing, and delivery in the same SPA document.
- Each replacement customer must physically arrive and expose an active order bubble before the next order begins. The result records `actual-delivery-1`, `actual-delivery-2`, and `actual-delivery-3`.
- The BGM element receives one QA-only identity marker. The same identity, one-element count, `loop=true`, playing/unmuted state, and strictly increasing `currentTime` are asserted at settings, select, Day 1 entry, after orders 1 and 2, summary, and Day 2. `currentTime` is set only once before the journey begins.
- The live kitchen now exposes `data-day={day.day}`. A product test covers Days 3 and 5, and fixture screenshots reject any requested/rendered day mismatch.
- Re-review gates: 36 test files / 234 tests, full art validation, production build, and Microsoft Edge 1440×810 journey all pass.
