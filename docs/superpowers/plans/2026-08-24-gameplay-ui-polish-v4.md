# Gameplay UI Polish V4 Implementation Plan

**Goal:** Add reliable tap controls to the full cooking and delivery loop while preserving drag and keyboard play.

**Architecture:** Centralize pointer-distance classification in a small utility. Existing kitchen eligibility, reducer actions, and delivery validation remain the source of truth; components only translate a stationary pointer release into the same automatic actions already used by keyboard controls.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Do not change gameplay, recipes, economy, progression, or saved data.
- Keep drag and keyboard input fully functional.
- Never perform both tap and click actions for one physical gesture.
- Pointer cancellation must remain side-effect free.
- Do not add dependencies.

---

### Task 1: Pointer intent utility

**Files:**
- Create: `src/landscape/pointerIntent.ts`
- Create: `src/landscape/pointerIntent.test.ts`

- [ ] Write tests for the 4-pixel mouse/pen and 10-pixel touch thresholds.
- [ ] Confirm the focused test fails because the module is missing.
- [ ] Implement the pure threshold and distance helpers.
- [ ] Run the focused tests.

### Task 2: Tap-to-place ingredients

**Files:**
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/components/game/KitchenScene.test.tsx`

- [ ] Add failing tests for stationary touch placement, small touch wobble, cancellation, and duplicate-click prevention.
- [ ] Store pointer type with drag state and use the shared intent helper.
- [ ] Route stationary releases through the existing automatic ingredient action.
- [ ] Keep explicit drag placement and sauce behavior unchanged.
- [ ] Update accessible labels to describe tap and drag.
- [ ] Run focused kitchen tests.

### Task 3: Tap-to-deliver dishes and guidance

**Files:**
- Modify: `src/components/game/ServingTray.tsx`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/components/game/TutorialOverlay.tsx`
- Modify: related tests

- [ ] Add failing tests for stationary tray delivery and invalid customer states.
- [ ] Route tray taps only to the active matching customer.
- [ ] Preserve drag delivery and keyboard delivery.
- [ ] Update help, tutorial, and accessible copy for both interaction modes.
- [ ] Run focused component and app tests.

### Task 4: Mobile browser QA and final verification

**Files:**
- Create: `scripts/capture-gameplay-ui-polish-v4.mjs`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v4/*.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v4/qa-results.json`

- [ ] Complete the guided first order at 844x390 using taps for ingredients and delivery.
- [ ] Capture cooking and delivery evidence and require zero console errors.
- [ ] Run `npm test -- --run` and require every test to pass.
- [ ] Run `npm run build` and require TypeScript and Vite success.
- [ ] Run `git diff --check`, commit the work, and confirm only the preserved `output/` directory remains untracked.
