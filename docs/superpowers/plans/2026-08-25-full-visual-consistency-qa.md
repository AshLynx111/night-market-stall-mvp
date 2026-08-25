# Full Visual Consistency QA Implementation Plan

> **For Codex:** Execute tasks in order. Preserve layout and gameplay. Stop UI edits at the P0/P1 boundary; record P2 without changing it.

**Goal:** Audit the complete production user flow at desktop and mobile-landscape sizes, fix only clear P0/P1 visual defects, and deliver reproducible screenshots plus a severity table.

**Architecture:** A Playwright production-preview runner drives the real game flow twice, captures paired screenshots, and writes machine-readable diagnostics. Manual screenshot review supplies art-direction judgments that DOM checks cannot make. Any accepted fix is local, covered by a focused contract test where practical, then validated by the full matrix.

**Tech Stack:** React, TypeScript, Vitest, Vite production preview, Playwright with Microsoft Edge, Sharp for deterministic QA contact sheets.

---

### Task 1: Map the production flow and existing QA helpers

**Files:**
- Read: `src/components/LandscapeGame.tsx`
- Read: `src/styles/landscape.css`
- Read: `scripts/current-reference-screens-qa.mjs`
- Read: `scripts/capture-day-retention-loop-v1.mjs`
- Read: `scripts/capture-summary-upgrade-icons-v1.mjs`

**Steps:**

1. Locate selectors and actions for home, level select, Day 1 tutorial, dual orders, summary, upgrades, Day 2, settings, and rotate prompt.
2. Reuse proven cooking gestures and wait conditions rather than introducing QA-only application state.
3. Confirm production preview and installed Edge paths.
4. Commit only if a reusable helper must change.

### Task 2: Add the reproducible full-flow capture runner

**Files:**
- Create: `scripts/capture-full-visual-consistency-v1.mjs`
- Create at runtime: `docs/qa/screenshots/full-visual-consistency-v1/*.png`
- Create at runtime: `docs/qa/screenshots/full-visual-consistency-v1/qa-results.json`

**Steps:**

1. Start a strict-port Vite production preview and fail on console/page errors.
2. Drive a clean Day 1 flow at 1440×810 and capture all eight key states.
3. Repeat the same clean flow at 844×390.
4. Capture the rotate prompt separately at 390×844.
5. For every state, collect viewport overflow, critical bounding boxes, resource decode status, icon/image inventory, visible controls, and representative state styles.
6. Generate desktop and compact contact sheets without modifying source screenshots.
7. Run the script and verify all expected files and dimensions.
8. Commit the QA runner and raw baseline evidence.

### Task 3: Review screenshots and classify findings

**Files:**
- Read: `docs/qa/screenshots/full-visual-consistency-v1/*.png`
- Read: `docs/qa/screenshots/full-visual-consistency-v1/qa-results.json`
- Create: `docs/qa/full-visual-consistency-v1.md`

**Steps:**

1. Inspect both contact sheets, then open every suspicious individual frame at original detail.
2. Search source and rendered text for emoji/system icon residue.
3. Check independent pasted assets, 2D/2.5D mismatch, icon scale/outline/light, text contrast, alignment, overlap, overflow, interaction states, baked-text collisions, cross-page button language, and safe-area behavior.
4. Assign each finding P0, P1, or P2 using the design severity rules.
5. Write the required report table before editing UI code.

### Task 4: Fix only confirmed P0/P1 defects

**Files:**
- Modify: only files named by confirmed P0/P1 findings
- Test: nearest relevant `src/**/*.test.*` contract file

**Steps:**

1. Add or extend a focused failing test for each objectively testable defect.
2. Run the focused test and confirm failure.
3. Apply the smallest local SVG/CSS/component correction without altering structure or gameplay.
4. Run the focused test and confirm pass.
5. Commit each coherent fix separately.
6. If no P0/P1 exists, make no UI source changes and state that explicitly in the report.

### Task 5: Regenerate final evidence and verify regression safety

**Files:**
- Update: `docs/qa/screenshots/full-visual-consistency-v1/*.png`
- Update: `docs/qa/screenshots/full-visual-consistency-v1/qa-results.json`
- Update: `docs/qa/full-visual-consistency-v1.md`

**Steps:**

1. Rebuild production output.
2. Rerun the full screenshot matrix after any fix.
3. Reinspect contact sheets and confirm no new P0/P1 regression.
4. Run the complete Vitest suite.
5. Run the production build and record module count.
6. Verify every expected PNG has the requested dimensions and the report lists every finding, including untouched P2 items.
7. Commit final QA evidence and report.

