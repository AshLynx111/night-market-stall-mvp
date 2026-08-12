# Asset-Driven Cooking UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live game use the approved visual files directly: a supplied full-screen start menu, physical ingredient vessels, one cumulative cooking image per completed operation, and one easy rightward swipe to roll.

**Architecture:** Keep the existing React kitchen state machine and replace only its presentation and gesture thresholds. Canonical cooking progress resolves to exactly one cumulative stage image; optional modifiers are resolved to flattened stage variants rather than runtime image layers. The supplied menu screenshot becomes a responsive background with accessible transparent interaction hotspots.

**Tech Stack:** React 19, TypeScript, CSS, Vite, Vitest, PNG assets.

## Global Constraints

- Do not add a separate inventory bar or floating ingredient cards.
- A roll completes with one rightward swipe; leftward swipes and taps do not complete it.
- Every visible cooking transition uses one complete stage image.
- The supplied start-screen image is the visual source of truth.
- Keep the existing six-day campaign and save format intact.

---

### Task 1: Interaction and Stage-Art Contracts

**Files:**
- Modify: `src/landscape/kitchen/gestures.test.ts`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Modify: `src/styles/referenceGameplayComposition.test.ts`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `measureRoll(path, rect)` and the existing kitchen DOM contracts.
- Produces: failing tests for a short right swipe, single-stage rendering, bowl vessels, and start-menu hotspots.

- [ ] **Step 1: Write failing tests** that require a 30% rightward roll, reject equal leftward movement, require only one `.griddle-slot__stage-art`, require `.table-ingredient__vessel`, and require the supplied start-menu plate plus five hotspot buttons.
- [ ] **Step 2: Run focused tests** with `npm test -- --run src/landscape/kitchen/gestures.test.ts src/components/game/KitchenScene.test.tsx src/App.test.tsx src/styles/referenceGameplayComposition.test.ts`; expect failures matching the new contracts.

### Task 2: One-Swipe Roll and Single-Image Stages

**Files:**
- Modify: `src/landscape/kitchen/gestures.ts`
- Modify: `src/components/game/GriddleSlot.tsx`
- Modify: `src/landscape/kitchen/assets.ts`
- Create: `src/assets/approved/stages/flattened/` generated PNG variants where an order modifier changes visible food.

**Interfaces:**
- Consumes: canonical completed step IDs and order modifiers.
- Produces: `stageArt(...) => string`, always returning one complete PNG URL for the current visible state.

- [ ] **Step 1: Implement directional roll measurement** using net positive X travel, a 30% width threshold, and broad 60% vertical tolerance.
- [ ] **Step 2: Remove runtime modifier image children** from `GriddleSlot`; render exactly one `img.griddle-slot__stage-art`.
- [ ] **Step 3: Resolve modifier-aware flattened art** inside `stageArt` so no topping is painted as an additional DOM layer.
- [ ] **Step 4: Run the Task 1 gesture and kitchen tests** and expect them to pass.

### Task 3: Physical Ingredient Vessels

**Files:**
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/styles/kitchen.css`

**Interfaces:**
- Consumes: existing ingredient image URLs and drag/drop callbacks.
- Produces: a semantic button whose visual content is clipped inside a metal bowl or tray while preserving drag behavior.

- [ ] **Step 1: Add vessel markup** with a separate clipped contents layer and retain the existing drag ghost.
- [ ] **Step 2: Style ingredients as metal bowls/trays** with perspective rims, inset shadows, no floating card chrome, and tutorial highlighting around the physical vessel.
- [ ] **Step 3: Run KitchenScene and style-contract tests** and expect them to pass.

### Task 4: Supplied Start-Screen Plate

**Files:**
- Create: `src/assets/approved/main-ui/start-screen-user-final.png`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape.css`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `start-screen-user-final.png`, current campaign save, and existing screen setters.
- Produces: full-bleed `.home-screen__art` and accessible `.home-hotspot` controls for start, continue, settings/help, collection/menu, and achievements/day selection.

- [ ] **Step 1: Import the supplied PNG** without redrawing or duplicating its visible UI.
- [ ] **Step 2: Replace `home-card`** with the full-screen plate and transparent, labelled hotspots positioned over the painted controls.
- [ ] **Step 3: Preserve navigation** by mapping start to Day 1/highest playable day, continue to the highest playable day, settings to help, collection to the menu, and achievements to day selection.
- [ ] **Step 4: Run App and composition tests** and expect them to pass.

### Task 5: Verification

**Files:**
- Modify only if verification identifies a defect in the files above.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: a buildable, playable implementation and browser screenshots.

- [ ] **Step 1: Run art validation** with `npm run validate:art`; expect success.
- [ ] **Step 2: Run all tests** with `npm test`; expect all tests to pass.
- [ ] **Step 3: Run production build** with `npm run build`; expect success.
- [ ] **Step 4: Play through Day 1 in a browser** and verify visible bowls, cumulative egg art, two sauce strokes, one right swipe roll, packing, delivery, and the replaced start screen.

## Self-Review

- Spec coverage: all four requested behavior/visual changes map to Tasks 2–4 and end-to-end verification is Task 5.
- Placeholder scan: no deferred implementation or unspecified error handling remains.
- Type consistency: existing `stageArt`, `measureRoll`, and screen state interfaces are retained.
