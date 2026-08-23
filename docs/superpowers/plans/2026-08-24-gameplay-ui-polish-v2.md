# Gameplay UI Polish V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify screen feedback, improve dense-order scanning, and preserve readable controls on short landscape displays without changing gameplay.

**Architecture:** Keep the existing conditional screen renderer and fixed 1440x810 kitchen coordinate system. Add small presentation helpers to `LandscapeGame`, content-derived density metadata to `OrderBubble`, one SVG icon, and CSS contracts for shared motion and bounded inverse scaling.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Do not change recipes, day targets, customer timing, economy, progression, or save format.
- Do not add dependencies or replace approved background plates.
- Keep audio optional and non-blocking.
- Respect `prefers-reduced-motion: reduce`.
- Preserve complete order semantics and every repeated ingredient.

---

### Task 1: Shared screen presentation and icon consistency

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/components/game/GameIcon.tsx`
- Modify: `src/components/game/GameIcon.test.tsx`
- Modify: `src/landscape.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `GameIcon` name `lock`, `ui-screen` root class, and screen-specific `data-ui-screen` values.

- [ ] Add failing tests that require a lock SVG and the shared screen presentation contract.
- [ ] Run `npm test -- --run src/components/game/GameIcon.test.tsx src/App.test.tsx` and confirm the new assertions fail.
- [ ] Add the lock icon, replace the day-select emoji, and apply `ui-screen` metadata to every screen root.
- [ ] Add shared screen/modal entrance CSS plus reduced-motion coverage.
- [ ] Re-run the focused tests and commit with `feat: unify screen presentation`.

### Task 2: Consistent UI sound routing

**Files:**
- Create: `src/game/uiFeedback.ts`
- Create: `src/game/uiFeedback.test.ts`
- Modify: `src/components/LandscapeGame.tsx`

**Interfaces:**
- Produces: `createUiFeedback(effectsEnabled: boolean)` returning `tap()`, `success()`, `upgrade(accepted: boolean)` methods.
- Consumes: existing `playSound` tone generator.

- [ ] Add unit tests that mock `playSound` and verify cue selection and disabled behavior.
- [ ] Run `npm test -- --run src/game/uiFeedback.test.ts` and confirm the missing module failure.
- [ ] Implement `createUiFeedback` and route screen navigation, modal actions, day start, and upgrades through it.
- [ ] Verify that each action still executes if Web Audio is unavailable.
- [ ] Run focused App and feedback tests and commit with `feat: align ui sound feedback`.

### Task 3: Dense order bubble layout

**Files:**
- Modify: `src/components/game/OrderBubble.tsx`
- Modify: `src/components/game/OrderBubble.test.tsx`
- Modify: `src/styles/kitchen.css`

**Interfaces:**
- Produces: `orderBubbleDensity(ingredientCount, modifierCount): 'regular' | 'compact'` and `data-order-density`.

- [ ] Add tests for regular and compact recipes, including preservation of repeated ingredient nodes.
- [ ] Run the focused order bubble test and confirm the density assertions fail.
- [ ] Implement content-derived density metadata and compact CSS sizing.
- [ ] Re-run the focused test and commit with `feat: compact dense order bubbles`.

### Task 4: Short-landscape readability

**Files:**
- Modify: `src/landscape.css`
- Modify: `src/styles/kitchen.css`
- Modify: `src/styles/referenceGameplayComposition.test.ts`
- Modify: `scripts/capture-gameplay-ui-polish-v2.mjs`

**Interfaces:**
- Consumes: existing `--scene-inverse-scale` custom property.
- Produces: short-landscape scaling contracts for HUD, order bubbles, tutorial, reward feedback, and help.

- [ ] Add CSS contract assertions for inverse-scaled anchored HUD groups and critical overlays.
- [ ] Run the focused style test and confirm it fails.
- [ ] Implement the short-landscape rules with compensated right offsets and stable transform origins.
- [ ] Create a Playwright flow capturing home, select, summary, dense orders, and 844x390 gameplay.
- [ ] Run visual QA, inspect each screenshot, and commit with `feat: improve short landscape readability`.

### Task 5: Final regression verification

**Files:**
- Create: `docs/qa/screenshots/gameplay-ui-polish-v2/*.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v2/qa-results.json`

**Interfaces:**
- Produces: final visual and browser-flow evidence.

- [ ] Run `npm test -- --run` and require all tests to pass.
- [ ] Run `npm run build` and require TypeScript and Vite success.
- [ ] Run `git diff --check` and inspect repository status.
- [ ] Commit QA evidence with `test: verify gameplay ui polish v2`.
