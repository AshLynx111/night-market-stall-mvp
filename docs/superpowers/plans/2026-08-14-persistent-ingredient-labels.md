# Persistent Ingredient Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permanent Chinese ingredient nameplates and stronger food presence to the per-day physical rack without changing gameplay behavior.

**Architecture:** `KitchenScene` continues to derive unlocked ingredients from `availableIngredients(day)`. `TableIngredient` renders food and a non-interactive label within the same geometry-bound button, while CSS handles the reference-matched presentation and per-layout scaling.

**Tech Stack:** React, TypeScript, CSS, Vitest, jsdom, Playwright/Edge visual QA.

## Global Constraints

- Keep the existing 2×3 Day 1 and 3×5 Day 2–6 physical rack backgrounds.
- Do not change ingredient unlock days, cooking reducers, gestures, timers, customers, or griddle geometry.
- Labels are permanent and use exact simplified-Chinese copy.
- Drag ghosts contain food only.

---

### Task 1: Lock the label contract with tests

**Files:**
- Modify: `src/components/game/KitchenScene.test.tsx`

**Interfaces:**
- Consumes: `KitchenScene`, `availableIngredients(day)`.
- Produces: DOM contract `.table-ingredient__label[data-ingredient-label-for]`.

- [ ] **Step 1: Add failing tests**

Assert Day 1/2/3/4/5 label counts are 5/8/11/13/15, assert the complete Day 5 label sequence, and assert every label is a direct child of its ingredient button while drag ghosts contain no label.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/components/game/KitchenScene.test.tsx`

Expected: failures because `.table-ingredient__label` does not exist.

### Task 2: Render exact permanent labels

**Files:**
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/styles/kitchen.css`

**Interfaces:**
- Consumes: `label: string`, canonical rack cell CSS variables.
- Produces: visible label spans and layout-specific food scaling.

- [ ] **Step 1: Correct label copy**

Use: 面皮、鸡蛋、热狗、刷酱、葱花、香菜、洋葱、辣椒粉、火鸡面、芝士、玉米粒、奥尔良鸡排、培根、里脊肉、金针菇.

- [ ] **Step 2: Add label markup**

Render `<span className="table-ingredient__label" data-ingredient-label-for={id}>{label}</span>` after the food viewport inside the button. Keep the drag ghost food-only.

- [ ] **Step 3: Style against physical wells**

Position the nameplate at the well's lower edge, add dark-brown/gold/ivory styling, reduce font size for long labels, and enlarge food within the existing clip mask. Use layout data attributes so the 2×3 rack remains proportionate.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run src/components/game/KitchenScene.test.tsx src/styles/kitchen-layout.test.ts`

Expected: all focused tests pass.

### Task 3: Validate the reference composition

**Files:**
- Modify only if required by assertions: `scripts/current-reference-screens-qa.mjs`
- Refresh: `artifacts/spatial-alignment-qa/day-1-empty.png`
- Refresh: `artifacts/spatial-alignment-qa/day-3.png`
- Refresh: `artifacts/spatial-alignment-qa/day-5.png`

**Interfaces:**
- Consumes: live 1440×810 kitchen route.
- Produces: screenshots demonstrating per-day counts, readable labels, and contained food.

- [ ] **Step 1: Run Edge QA at Day 1, Day 3, and Day 5**

Verify labels count 5/11/15, label text matches the DOM ingredient order, no label intersects a griddle/tutorial/customer, and no food escapes its well mask.

- [ ] **Step 2: Inspect all screenshots at original detail**

Reject any unreadable, clipped, duplicated, or mismatched label and adjust only label/food CSS.

- [ ] **Step 3: Run release gates**

Run: `npm run validate:art`, `npm test -- --run`, and `npm run build`.

Expected: art validation, all tests, and production build pass.
