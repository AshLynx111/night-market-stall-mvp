# Summary Upgrade Icon Skeuomorphism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the summary row's flat funds, fire, and sign SVGs into one warm 2.5D ornament family without changing layout or behavior.

**Architecture:** Keep the existing `UpgradeCardIcon` interface and three summary icon wells. Redraw each icon as shared material layers with namespaced gradients, then centralize outline, highlight, inset shade, and bottom shadow in summary-scoped CSS.

**Tech Stack:** React 19, TypeScript, inline SVG gradients, CSS, Vitest, Playwright, Microsoft Edge, Sharp.

## Global Constraints

- Preserve all summary card bounds, text, prices, levels, button handlers, disabled states, and storage behavior.
- Preserve the 48×48 icon view box and equal rendered dimensions.
- Use a shared `2.6px` rounded warm-brown outline, upper-left warm light, lower-right internal shade, and `0 3px 1px` bottom shadow.
- Use no emoji, raster icon, external library, animation, or high-detail illustration.
- Funds is a pouch plus bronze coin; fire is a small stove badge; sign is a small wooden signboard.

---

### Task 1: Strengthen the visual component contract

**Files:**
- Modify: `src/components/game/UpgradeCardIcon.test.tsx`

**Interfaces:**
- Consumes: `UpgradeCardIcon({ kind }: { kind: 'funds' | 'fire' | 'sign' })`.
- Requires: namespaced gradient IDs and shared body, accent, shade, highlight, and detail layer classes.

- [ ] **Step 1: Change the test to require the 2.5D contract**

Assert `stroke-width="2.6"`, gradient definitions named with each variant, all five shared material classes, 48×48 geometry, rounded joins/caps, decorative semantics, and no raster/emoji content. Add semantic assertions that fire includes a stove layer and sign includes a plaque layer.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run src/components/game/UpgradeCardIcon.test.tsx`

Expected: FAIL because the current component uses `2px` flat fills and lacks the material layers.

### Task 2: Redraw the unified miniature ornaments

**Files:**
- Modify: `src/components/game/UpgradeCardIcon.tsx`
- Modify: `src/landscape.css`
- Modify: `src/styles/referenceGameplayComposition.test.ts`

**Interfaces:**
- Preserves: `UpgradeCardIconKind` and `UpgradeCardIcon` signature.
- Produces: identical 53×53 rendered icon boxes inside the existing wells.

- [ ] **Step 1: Replace flat geometry with layered SVG drawings**

Add namespaced body, accent, and inset gradients. Draw the pouch with an overlapping square-hole coin, the fire variant as a squat stove with flame/opening/vents/feet, and the sign variant as a hanging beveled wooden plaque. Use common material layer class names and `data-icon-form="pouch|stove|plaque"` markers.

- [ ] **Step 2: Update common material CSS**

Increase the shared outline to `2.6px` at the SVG root. Replace the flat main/accent rules with gradient-backed SVG fills, pale upper-left highlight strokes, translucent lower inset shade, and a common `drop-shadow(0 3px 1px rgb(37 18 11 / .42))`. Keep icon-well and card positioning rules untouched.

- [ ] **Step 3: Update the CSS contract test**

Require the common 2.5D shadow and all material layer selectors. Continue asserting the summary-only icon well and all three `UpgradeCardIcon` calls.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/components/game/UpgradeCardIcon.test.tsx src/App.test.tsx src/styles/referenceGameplayComposition.test.ts`

Expected: all focused tests pass and existing App upgrade assertions remain unchanged.

- [ ] **Step 5: Commit the redraw**

```powershell
git add src/components/game/UpgradeCardIcon.tsx src/landscape.css src/components/game/UpgradeCardIcon.test.tsx src/styles/referenceGameplayComposition.test.ts
git commit -m "fix: give upgrade icons warm 2.5d materials"
```

### Task 3: Production regression and visual comparison

**Files:**
- Create: `scripts/capture-summary-upgrade-icons-v2.mjs`
- Create: `docs/qa/screenshots/summary-upgrade-icons-v2/summary-upgrade-icons-1440x810.png`
- Create: `docs/qa/screenshots/summary-upgrade-icons-v2/qa-results.json`

**Interfaces:**
- Baseline: `docs/qa/screenshots/summary-upgrade-icons-v1/summary-upgrade-icons-1440x810.png`.
- Produces: real production summary screenshot and machine-readable geometry/material checks.

- [ ] **Step 1: Add v2 browser QA**

Reuse the real three-order Day 1 flow. Assert three 48×48 inline SVGs, `2.6px` equal outlines, shared highlight/shade classes, identical CSS shadow, equal 53×53 boxes, no raster descendants, unchanged card bounds, decoded assets, and zero console/page errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm test -- --run`

Expected: all test files and tests pass.

- [ ] **Step 3: Build production**

Run: `npm run build`

Expected: TypeScript and Vite complete without errors.

- [ ] **Step 4: Capture and inspect at 1440×810**

Run: `node scripts/capture-summary-upgrade-icons-v2.mjs`

Expected: all automated material/geometry checks pass. Compare against v1 and confirm the new pouch/coin, stove, and wood plaque share one light direction, view, scale, outline, volume, and inset appearance without becoming glossy stickers.

- [ ] **Step 5: Commit QA evidence**

```powershell
git add -f scripts/capture-summary-upgrade-icons-v2.mjs docs/qa/screenshots/summary-upgrade-icons-v2
git commit -m "test: verify skeuomorphic upgrade icons"
```
