# Mobile HUD Layout Final Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove gameplay HUD counter-scaling and produce verified, non-overlapping Poki Mobile HUD screenshots at three landscape sizes.

**Architecture:** Keep the desktop logical HUD as the coordinate source, let `.game-screen__logical` apply the only scene scale, and validate the rendered result with Playwright. Use Sharp only to compose the three QA screenshots into one contact sheet.

**Tech Stack:** CSS, Vitest, Playwright, Sharp, Vite Poki production build

## Global Constraints

- Do not change `100svh`, settled viewport resize behavior, `touchSafeAction`, Poki lifecycle, Summary layout, or desktop HUD geometry.
- Do not remove `--scene-inverse-scale` from non-HUD overlays.
- Do not use counter-scale, inverse-scale, or viewport-pixel HUD positioning.
- Produce one commit on `codex/poki-platform-build-v1` and push it without merging `main`.

---

### Task 1: Reject HUD Counter-Scaling

**Files:**
- Modify: `src/styles/visualSystemUnification.test.ts`
- Modify: `src/landscape.css`

**Interfaces:**
- Consumes: the max-height 480 landscape CSS block.
- Produces: HUD rules that inherit `.game-screen__logical` scaling.

- [ ] **Step 1: Add a source contract that extracts the short-landscape block, filters gameplay HUD rules, and rejects `var(--scene-inverse-scale)` in their declarations.**

```ts
for (const [, selector, declarations] of shortLandscapeRules) {
  if (/\.gameplay-hud__(?:day|orders|coins|control)/.test(selector)) {
    expect(declarations).not.toContain('var(--scene-inverse-scale)')
  }
}
```

- [ ] **Step 2: Run `npm test -- src/styles/visualSystemUnification.test.ts` and confirm the old counter-scale rules fail.**
- [ ] **Step 3: Remove the HUD inverse transforms and inverse-scaled right offsets while retaining non-HUD inverse scaling.**
- [ ] **Step 4: Re-run the focused test and expect all tests to pass.**

### Task 2: Validate Rendered HUD Layout

**Files:**
- Modify: `scripts/qa-poki-platform-build-v1.mjs`
- Modify: `docs/qa/screenshots/poki-mobile-final-fix/qa-results.json`

**Interfaces:**
- Consumes: five HUD selectors and the active `.kitchen-customer__bubble`.
- Produces: `hudLayout.elements`, `hudLayout.pairs`, and exact intersection areas.

- [ ] **Step 1: Add `inspectHudLayout(page)` to serialize each viewport rectangle and compute adjacent intersections.**

```js
const intersectionArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
```

- [ ] **Step 2: Assert every required adjacent pair and Orders/order-bubble intersection equals zero.**
- [ ] **Step 3: Run this QA for 640x360, 836x470, and a dedicated 844x390 gameplay-only context.**

### Task 3: Produce Visual Evidence

**Files:**
- Modify: `scripts/qa-poki-platform-build-v1.mjs`
- Create: `docs/qa/screenshots/poki-mobile-final-fix/gameplay-844x390.png`
- Create: `docs/qa/screenshots/poki-mobile-final-fix/mobile-hud-contact-sheet.png`
- Update: existing 640x360 and 836x470 gameplay screenshots.

**Interfaces:**
- Consumes: the three gameplay PNG paths.
- Produces: a labeled, side-by-side PNG contact sheet.

- [ ] **Step 1: Capture each screenshot only after English gameplay and an active customer are visible.**
- [ ] **Step 2: Use Sharp `fit: 'contain'` to place all screenshots in equal cells without distortion.**
- [ ] **Step 3: Inspect the three screenshots and contact sheet at original resolution.**

### Task 4: Verify and Deliver

**Files:**
- Verify all scoped code, QA JSON, and PNG artifacts.

**Interfaces:**
- Consumes: repository commands and the current Git branch.
- Produces: one pushed commit.

- [ ] **Step 1: Run `npm test`, `npm run build`, `npm run build:poki`, and `npm run test:poki`; expect all to pass.**
- [ ] **Step 2: Restore unrelated regenerated QA artifacts and confirm `output/` remains untouched.**
- [ ] **Step 3: Commit once and push `codex/poki-platform-build-v1` without merging `main`.**
