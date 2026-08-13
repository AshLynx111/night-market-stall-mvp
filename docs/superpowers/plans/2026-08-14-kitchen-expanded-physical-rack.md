# Kitchen Expanded Physical Rack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every later-day ingredient inside one of fifteen visible physical steel wells while preserving the accepted Day 1 2 × 3 rack and all protected gameplay.

**Architecture:** Track the accepted 1672 × 941 ImageGen source and deterministically composite only its lower-left 3 × 5 rack region onto the existing customer-clean approved plate, producing a second expanded live background. Select the Day 1 or expanded derivative from unlocked ingredient count. Model later-day controls and inner masks from measured per-cell physical polygons rather than the rejected uniform nominal grid, and reuse those polygons for runtime positioning and independent live-versus-empty pixel acceptance.

**Tech Stack:** React 19, TypeScript, CSS clip paths, Sharp deterministic compositing, Vitest, Playwright 1.62.1 with Microsoft Edge.

## Global Constraints

- Use `C:\Users\qianwu\.codex\generated_images\019fb375-3854-73d3-becc-5ed5258e556b\exec-e30ffcae-07d7-4801-9827-a627e7da0f11.png` only through localized deterministic compositing; never use it wholesale as a live background.
- Day 1 retains the accepted 2 × 3 physical-rack background and geometry; later days with more than six unlocked ingredients select a distinct physical 3 × 5 background.
- All fifteen later-day controls and inner masks must align with visible steel wells; no loose ingredient icon may appear outside a well.
- Active drag stays food-only. Both griddles and all protected customers, orders, recipes, sauce two-stroke, roll, heat, unlocks, prices, BGM, and other screen composition remain unchanged.
- Pixel acceptance compares stationary food to the matching empty-rack background and requires zero rim, outside, and unused-cell leakage, with only the existing explicit one-pixel clip-edge antialias accounting.
- Exact five 1440 × 810 PNG manifest, three real Day 1 orders, settings, audio, gestures, clean-clone reproducibility, independent original-detail review, clean tree, and no push are mandatory.

---

### Task 1: RED contracts for distinct physical backgrounds and per-well geometry

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/landscape/kitchen/sceneGeometry.test.ts`
- Modify: `src/styles/kitchenCompositionAsset.test.ts`
- Modify: `scripts/art-remake/build-live-kitchen-plate.test.mjs`

**Interfaces:**
- Consumes: existing `RackLayout`, `rackRectangles()`, and `rackInnerPolygons()`.
- Produces: failing expectations for `kitchen-screen-live-expanded-clean.png`, fifteen measured expanded controls/inner polygons, distinct Day 1/Day 5 background URLs, tracked accepted-source hash, deterministic expanded rebuild, and zero changes outside one localized rack polygon.

- [ ] **Step 1: Add failing product and geometry tests**

Assert Day 1 uses `kitchen-screen-live-clean.png`, Day 5 uses `kitchen-screen-live-expanded-clean.png`, the URLs differ, and each of fifteen expanded inner polygons is strictly inside its own measured control and disjoint from all others and both griddles.

- [ ] **Step 2: Add failing composite contracts**

Assert the accepted source SHA-256 is `5b8b82f7894e884d6c082fed324ea6ec33e4c9523ca08839ab69ac9c0035644f`, the expanded output rebuilds byte-for-byte, and every changed pixel relative to the current Day 1 live plate stays inside the approved localized 3 × 5 rack polygon.

- [ ] **Step 3: Run RED tests**

Run: `npm test -- --run src/App.test.tsx src/landscape/kitchen/sceneGeometry.test.ts src/styles/kitchenCompositionAsset.test.ts scripts/art-remake/build-live-kitchen-plate.test.mjs`

Expected: failures for missing expanded source/output, missing per-well geometry, and identical background selection.

### Task 2: Deterministic localized expanded background

**Files:**
- Add: `src/assets/art-source/kitchen-expanded-rack-imagegen-source.png`
- Add: `src/assets/approved/main-ui/kitchen-screen-live-expanded-clean.png`
- Modify: `scripts/art-remake/build-live-kitchen-plate.mjs`
- Modify: `scripts/art-remake/build-live-kitchen-plate.test.mjs`
- Modify: `scripts/full-art-manifest.mjs`
- Modify: `src/styles/kitchenCompositionAsset.test.ts`

**Interfaces:**
- Consumes: the existing customer-clean/Day 1 build pipeline and accepted 1672 × 941 generated source.
- Produces: `expandedRackSourcePath`, `expandedOutputPath`, `EXPANDED_RACK_COMPOSITE_POLYGON`, and `buildExpandedKitchenPlate({ output })`.

- [ ] **Step 1: Copy and inspect the accepted source**

Copy exact bytes into the tracked art-source path; verify 1672 × 941 RGB, byte size 2,331,003, and the required SHA-256.

- [ ] **Step 2: Implement the minimal localized composite**

Start from the current deterministic Day 1 live plate buffer and overlay only the accepted source pixels under the measured expanded-rack polygon with a narrow feather. Preserve exact source pixels outside that polygon.

- [ ] **Step 3: Build and inspect the expanded derivative**

Generate the tracked expanded output and inspect source, Day 1 derivative, and expanded derivative at original detail; reject seams, food remnants, changes to griddles/utensils/HUD, or missing steel wells.

- [ ] **Step 4: Run composite tests GREEN**

Run: `npm test -- --run scripts/art-remake/build-live-kitchen-plate.test.mjs src/styles/kitchenCompositionAsset.test.ts`

Expected: all source-hash, byte-rebuild, and outside-mask invariance assertions pass.

### Task 3: Select the correct background and align all fifteen controls

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape/kitchen/sceneGeometry.ts`
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/styles/kitchen.css`
- Modify: `src/App.test.tsx`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Modify: `src/landscape/kitchen/sceneGeometry.test.ts`
- Modify: `src/styles/kitchen-layout.test.ts`
- Modify: `src/styles/referenceGameplayComposition.test.ts`

**Interfaces:**
- Consumes: per-cell physical measurements from the accepted expanded rack.
- Produces: `rackRectangles('expanded-3x5')` and `rackInnerPolygons('expanded-3x5')` as fifteen per-cell records, plus later-day background selection keyed by `availableIngredients(day.day).length > 6`.

- [ ] **Step 1: Generalize expanded geometry to per-cell records**

Retain the uniform Day 1 layout. Represent the perspective 3 × 5 rack with fifteen explicit control rectangles and inner polygons. Publish each ingredient's own left/top/width/height and clip variables from `TableIngredient`; keep griddle variables on the scene.

- [ ] **Step 2: Select the physical background derivative**

Import both live plates in `LandscapeGame.tsx`, choose the expanded plate for days whose unlocked ingredient count exceeds six, and apply it consistently to the background image and foreground counter slice. Expose the selected filename/layout in data attributes for QA.

- [ ] **Step 3: Align food to the physical wells**

Use each measured inner polygon as the food viewport. Preserve the complete control as the hitbox, food-only art, nested food-only ghost, and all sauce/keyboard/drop behavior.

- [ ] **Step 4: Run focused product tests GREEN**

Run: `npm test -- --run src/App.test.tsx src/components/game/KitchenScene.test.tsx src/landscape/kitchen/sceneGeometry.test.ts src/styles/kitchen-layout.test.ts src/styles/referenceGameplayComposition.test.ts`

Expected: Day 1/Day 5 backgrounds differ; all fifteen controls/masks match physical wells; protected interaction tests remain green.

### Task 4: Matching-baseline pixel evidence and original-detail Edge acceptance

**Files:**
- Modify: `scripts/current-reference-screens-qa.mjs`
- Modify: `scripts/spatial-alignment-qa-contract.mjs`
- Modify: `scripts/spatial-alignment-qa-contract.test.mjs`
- Refresh: `artifacts/spatial-alignment-qa/result.json`
- Refresh: `artifacts/spatial-alignment-qa/day-3.png`
- Refresh: `artifacts/spatial-alignment-qa/day-5.png`
- Refresh as generated: the other three exact-manifest PNGs

**Interfaces:**
- Consumes: selected background marker and fifteen canonical per-cell polygons.
- Produces: v4 evidence recording Day 1 2 × 3 and Day 3/5 physical 3 × 5 background identity, every cell's well mapping, stationary-food pixel acceptance, active drag, exact screenshots, and existing interaction/audio gates.

- [ ] **Step 1: Extend the schema contract RED**

Require distinct background filenames for Day 1 and later fixtures, `physicalWellCount` 6/15/15, each active ingredient mapped to a visible well, and the existing zero leakage counters.

- [ ] **Step 2: Capture against the selected empty background**

Continue hiding only stationary food for paired captures. Read per-cell canonical polygons from scene data, verify the selected background marker, and classify all changed pixels against the physical-well controls, rims, and unused wells.

- [ ] **Step 3: Run the complete Edge journey**

Run: `node scripts/current-reference-screens-qa.mjs`

Expected: actual Edge version recorded; Day 1/3/5, active drag, exact five PNGs, settings, both griddles, three real deliveries, sauce/roll, and BGM all pass.

- [ ] **Step 4: Inspect all evidence at original detail**

Explicitly inspect Day 5 and confirm every one of fifteen items has a visible steel bin. Also inspect Day 3, Day 1, dual griddles, settings, accepted source, and expanded derivative.

### Task 5: Full gates, authoritative report, clean clone, and independent review

**Files:**
- Rewrite: `.superpowers/sdd/spatial-alignment-report.md`
- Append: `.superpowers/sdd/progress.md`

**Interfaces:**
- Consumes: final v4 evidence, hashes, gate totals, build names, and commits.
- Produces: one current report and clean reviewed branch.

- [ ] **Step 1: Run all local gates**

Run `npm run validate:art`, `npm test -- --run`, `npm run build`, and `git diff --check`. Record exact totals.

- [ ] **Step 2: Rewrite the authoritative report**

State both backgrounds, accepted-source and output hashes, localized mask invariance, exact fifteen-well geometry, pixel counts, Edge version, screenshot hashes/verdicts, protected behavior, and no stale compact-overflow acceptance.

- [ ] **Step 3: Commit intended files only**

Create implementation/evidence and final-report commits without pushing; verify a clean worktree.

- [ ] **Step 4: Prove clean-clone reproducibility**

Fresh-clone the committed branch, run `npm ci`, focused rebuild/schema tests, production build, and the complete Edge runner.

- [ ] **Step 5: Obtain an independent final re-review**

Require explicit original-detail Day 5 confirmation that all fifteen items have visible physical steel bins, plus separate Spec Compliance and Code Quality verdicts with no Critical or Important findings.
