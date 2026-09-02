# Gameplay HUD Touch Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove positional interaction feedback from gameplay HUD buttons and prove real touch press/release geometry is stable.

**Architecture:** Enforce a CSS-level transform invariant on HUD buttons, keep desktop-only visual hover feedback, and extend both static CSS contracts and Poki production browser QA. No component behavior or viewport code changes are needed.

**Tech Stack:** CSS, Vitest, Playwright, Vite Poki production build

## Global Constraints

- Do not change viewport scaling, `100svh`, gameplay geometry, HUD dimensions, `touchSafeAction`, Poki lifecycle, or UI structure.
- Keep `.gameplay-hud__orders` static `translateX(-50%)` positioning.
- Produce one commit on `codex/poki-platform-build-v1` and push it without merging `main`.

---

### Task 1: Lock the CSS Interaction Contract

**Files:**
- Modify: `src/styles/visualSystemUnification.test.ts`
- Modify: `src/landscape.css`

**Interfaces:**
- Consumes: `.gameplay-hud button`, `:hover`, and `:active` CSS selectors.
- Produces: stable transforms with desktop fine-pointer hover feedback.

- [ ] **Step 1: Replace the old active-translation expectation with assertions for base, hover, and active `transform: none` declarations and fine-pointer hover gating.**
- [ ] **Step 2: Run `npm test -- --run src/styles/visualSystemUnification.test.ts` and verify the new contract fails against `translateY`.**
- [ ] **Step 3: Set the base HUD button transform to `none`, move hover into `@media (hover: hover) and (pointer: fine)`, and keep active feedback limited to filter and shadow.**
- [ ] **Step 4: Re-run the focused test and expect it to pass.**

### Task 2: Add Real Touch Geometry QA

**Files:**
- Modify: `scripts/qa-poki-platform-build-v1.mjs`

**Interfaces:**
- Consumes: Playwright locators for `.gameplay-hud__day`, `.gameplay-hud__control--pause`, and `.gameplay-hud__control--sound`.
- Produces: `hud.geometry` records containing normal, pressed, and released bounds for each control.

- [ ] **Step 1: Add a helper that dispatches touch start/end through CDP and records each button bounding rectangle at all three states.**
- [ ] **Step 2: Assert exact equality of `top` and `left` for normal, pressed, and released states.**
- [ ] **Step 3: Run the Poki production QA and expect both 640x360 and 836x470 touch viewports to pass.**

### Task 3: Full Verification and Delivery

**Files:**
- Verify all modified files and generated QA result updates.

**Interfaces:**
- Consumes: repository test/build commands and Git remote branch.
- Produces: one pushed commit.

- [ ] **Step 1: Run `npm test`, `npm run build`, `npm run build:poki`, and `npm run test:poki`; expect all commands to pass.**
- [ ] **Step 2: Review the diff and confirm no forbidden subsystem changed.**
- [ ] **Step 3: Commit all scoped changes once and push `codex/poki-platform-build-v1`.**
