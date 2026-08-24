# Gameplay UI Polish V5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit the unchanged 1440×810 kitchen scene inside real landscape mobile safe areas and react to rotation and browser chrome changes.

**Architecture:** Add a CSS-owned safe viewport and a small measurement hook. The hook observes the viewport's real rectangle and continues to publish the existing scene scale variables, so kitchen coordinates and consumers remain unchanged.

**Tech Stack:** React 19, TypeScript, CSS environment variables, ResizeObserver, Visual Viewport API, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Do not change the 1440×810 logical gameplay coordinate system.
- Do not change gameplay, recipes, economy, progression, or saved data.
- Support missing `ResizeObserver` and missing `visualViewport` without throwing.
- Do not add dependencies.
- Keep portrait gameplay behind the existing rotate-device prompt.

---

### Task 1: Viewport scale unit

**Files:**
- Create: `src/landscape/useGameplayViewport.ts`
- Create: `src/landscape/useGameplayViewport.test.tsx`

**Interfaces:**
- Produces: `fitGameplayScene(width: number, height: number): number`.
- Produces: `useGameplayViewport(): { viewportRef: RefObject<HTMLDivElement | null>; sceneScale: number; sceneInverseScale: number }`.

- [ ] Write calculation tests requiring `fitGameplayScene(720, 810) === 0.5`, `fitGameplayScene(1440, 405) === 0.5`, and invalid dimensions to return `1`.
- [ ] Write a hook harness with a mocked viewport rectangle and ResizeObserver callback; require scale updates and observer disconnection.
- [ ] Run `npm test -- --run src/landscape/useGameplayViewport.test.tsx` and confirm the missing-module failure.
- [ ] Implement the pure fitting function, guarded measurement, ResizeObserver, window resize, and optional visual viewport resize listener.
- [ ] Run the focused test and require all assertions to pass.

### Task 2: Safe viewport integration

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape.css`
- Modify: `src/styles/kitchen-layout.test.ts`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `useGameplayViewport()` from Task 1.
- Produces: `.game-screen__safe-viewport` wrapping `.game-screen__logical`.
- Produces: `--game-safe-top`, `--game-safe-right`, `--game-safe-bottom`, and `--game-safe-left`.

- [ ] Add CSS contract assertions for all four `env(safe-area-inset-*, 0px)` variables, safe viewport insets, and centered logical scene transform.
- [ ] Add an App assertion that the live kitchen renders the safe viewport around the logical scene.
- [ ] Run the focused layout and App tests and confirm the new assertions fail.
- [ ] Replace `window.innerWidth` scaling in `LandscapeGame` with `useGameplayViewport()`.
- [ ] Wrap the fixed logical scene in the safe viewport without moving any kitchen child.
- [ ] Add safe-area custom properties, viewport positioning, clipping, centering, and rotate prompt padding.
- [ ] Run the focused tests and require them to pass.

### Task 3: Notched landscape browser QA and final verification

**Files:**
- Create: `scripts/capture-gameplay-ui-polish-v5.mjs`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v5/notched-gameplay-667x375.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v5/notched-pause-667x375.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v5/qa-results.json`

**Interfaces:**
- Produces: deterministic boundary evidence using synthetic safe variables `8px 44px 21px 44px`.

- [ ] Start Vite on a strict local port and open Day 2 at 667×375 with the guided tutorial marked complete.
- [ ] Override the four safe variables on `.game-screen` and wait for ResizeObserver to update scale.
- [ ] Assert logical bounds are inside safe viewport bounds with at most one pixel tolerance.
- [ ] Complete one tap-to-place action, open the pause dialog, and capture both states.
- [ ] Require zero browser console errors and write the measured rectangles and scale to `qa-results.json`.
- [ ] Run `npm test -- --run` and require every test to pass.
- [ ] Run `npm run build` and require TypeScript and Vite success.
- [ ] Run `git diff --check`, commit QA evidence, and confirm only the preserved `output/` directory remains untracked.
