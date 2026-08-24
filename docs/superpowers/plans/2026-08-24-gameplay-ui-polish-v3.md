# Gameplay UI Polish V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all gameplay overlays keyboard-safe and provide concise assistive status semantics without changing gameplay.

**Architecture:** Introduce a reusable `AccessibleDialog` for modal mechanics and a `useGameplayShortcuts` hook for live-screen keys. Existing content components and callbacks stay responsible for game actions, while the new units own focus and keyboard routing only.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Do not change gameplay, economy, progression, or saved data.
- Do not add dependencies or key-remapping settings.
- Suppress gameplay shortcuts in editable controls and open dialogs.
- Restore focus only when the previous element remains connected.
- Avoid live-announcing rapid patience and cooking ticks.

---

### Task 1: Shared accessible dialog

**Files:**
- Create: `src/components/game/AccessibleDialog.tsx`
- Create: `src/components/game/AccessibleDialog.test.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape.css`

**Interfaces:**
- Produces: `AccessibleDialog({ label, className, onClose, children })`.

- [ ] Write tests for initial focus, Tab wrapping, Shift+Tab wrapping, Escape, and focus restoration.
- [ ] Run the focused test and confirm it fails because the component is missing.
- [ ] Implement the primitive with a focusable section fallback and connected-trigger restoration.
- [ ] Replace menu, help, and abandonment modal mechanics while preserving their copy and classes.
- [ ] Run dialog and App tests; commit with `refactor: unify accessible dialogs`.

### Task 2: Gameplay shortcuts

**Files:**
- Create: `src/landscape/useGameplayShortcuts.ts`
- Create: `src/landscape/useGameplayShortcuts.test.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/components/game/GameplayHud.tsx`

**Interfaces:**
- Produces: `useGameplayShortcuts({ enabled, dialogOpen, onPause, onHelp, onMusic })`.

- [ ] Write hook tests for Escape, H, M, input suppression, dialog suppression, and listener cleanup.
- [ ] Run the focused test and confirm the missing-module failure.
- [ ] Implement the hook and connect it only during live gameplay.
- [ ] Add `aria-keyshortcuts` to matching controls.
- [ ] Run focused tests; commit with `feat: add safe gameplay shortcuts`.

### Task 3: Status semantics

**Files:**
- Modify: `src/components/game/GameplayHud.tsx`
- Modify: `src/components/game/GameplayHud.test.tsx`
- Modify: `src/components/game/DeliveryFeedback.tsx`
- Modify: `src/components/game/DeliveryFeedback.test.tsx`
- Modify: `src/components/game/TutorialOverlay.tsx`
- Modify: `src/components/game/TutorialOverlay.test.tsx`

**Interfaces:**
- Produces: WAI-ARIA progressbar values and atomic polite status regions.

- [ ] Add failing semantic assertions to component tests.
- [ ] Implement progressbar and atomic status metadata without changing visible copy.
- [ ] Run focused tests; commit with `feat: improve gameplay status semantics`.

### Task 4: Keyboard browser QA and final verification

**Files:**
- Create: `scripts/capture-gameplay-ui-polish-v3.mjs`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v3/*.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v3/qa-results.json`

**Interfaces:**
- Produces: keyboard-flow and screenshot evidence with zero console errors.

- [ ] Run a keyboard-only browser flow for H, Escape, M, Tab wrapping, and focus restoration.
- [ ] Capture help and pause modal states at desktop and short-landscape sizes.
- [ ] Run `npm test -- --run` and require every test to pass.
- [ ] Run `npm run build` and require TypeScript and Vite success.
- [ ] Run `git diff --check`, commit QA evidence with `test: verify gameplay accessibility polish`, and confirm only the preserved `output/` directory remains untracked.
