# Summary Upgrade Icon Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the summary upgrade row's three mismatched baked illustrations with one cohesive flat hand-drawn SVG icon family without changing layout or behavior.

**Architecture:** A focused `UpgradeCardIcon` component owns the decorative SVG geometry. `UpgradeShop` renders its three variants, while summary-scoped CSS creates equal wood-colored wells that cover the baked art; all data flow and click handlers remain in `LandscapeGame` unchanged.

**Tech Stack:** React 19, TypeScript, inline SVG, CSS, Vitest, Testing Library static rendering, Playwright with Microsoft Edge.

## Global Constraints

- Preserve the current summary page structure and all three card coordinates.
- Preserve prices, levels, disabled states, purchase handlers, campaign storage, and retention behavior.
- Use no emoji, raster icon, external icon package, new dependency, or detailed PNG illustration.
- All three icons use a 48×48 view box, `2px` warm-brown outline, rounded strokes, flat fills, equal CSS shadow strength, and comparable rendered size.
- Apply the visual replacement to the summary screen only; keep the level-select upgrade row unchanged.

---

### Task 1: Build the unified inline-SVG family

**Files:**
- Create: `src/components/game/UpgradeCardIcon.tsx`
- Create: `src/components/game/UpgradeCardIcon.test.tsx`

**Interfaces:**
- Produces: `UpgradeCardIcon({ kind }: { kind: 'funds' | 'fire' | 'sign' })`
- Produces: `[data-upgrade-card-icon="funds|fire|sign"]` for integration and browser QA.

- [ ] **Step 1: Write the failing component contract test**

Render all three variants to static markup and assert each contains `viewBox="0 0 48 48"`, `stroke-width="2"`, rounded caps/joins, `aria-hidden="true"`, a matching `data-upgrade-card-icon`, and no `img`, `image`, `filter`, or emoji content.

- [ ] **Step 2: Run the focused test and verify the missing module failure**

Run: `npm test -- --run src/components/game/UpgradeCardIcon.test.tsx`

Expected: FAIL because `./UpgradeCardIcon` does not exist.

- [ ] **Step 3: Implement the minimal SVG component**

Create a 48×48 decorative SVG whose shared root owns the outline settings. Draw a tied pouch and coin for `funds`, an outer and inner flame for `fire`, and a capped ribbed lantern for `sign`. Use only `<path>`, `<circle>`, and `<line>` geometry with `upgrade-card-icon__main`, `upgrade-card-icon__accent`, and `upgrade-card-icon__detail` classes.

- [ ] **Step 4: Run the component test**

Run: `npm test -- --run src/components/game/UpgradeCardIcon.test.tsx`

Expected: 1 test file passes.

- [ ] **Step 5: Commit the component**

```powershell
git add -f src/components/game/UpgradeCardIcon.test.tsx
git add src/components/game/UpgradeCardIcon.tsx
git commit -m "feat: add unified upgrade card icons"
```

### Task 2: Integrate and style the summary-only icon wells

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape.css`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/referenceGameplayComposition.test.ts`

**Interfaces:**
- Consumes: `UpgradeCardIcon` and its three `kind` values.
- Preserves: `UpgradeShop({ save, onBuy })`, button labels, button order, and `onBuy('fire' | 'sign')` callbacks.

- [ ] **Step 1: Add failing integration and CSS-contract assertions**

In the summary App test, assert exactly one funds, fire, and sign SVG exists under `.summary-screen`, and assert the two existing upgrade buttons retain their accessible names. In the CSS contract, assert `.summary-screen .upgrade-shop__icon` becomes a grid while the base `.upgrade-shop__icon` remains `display: none`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- --run src/App.test.tsx src/styles/referenceGameplayComposition.test.ts`

Expected: FAIL because the funds variant and summary icon-well rules do not exist.

- [ ] **Step 3: Replace the hidden generic icons in `UpgradeShop`**

Import `UpgradeCardIcon`. Add a decorative funds icon span inside `upgrade-shop__funds`; replace the fire and sign `GameIcon` instances inside the existing buttons. Do not move, wrap, rename, reorder, or change any button.

- [ ] **Step 4: Add summary-scoped common styling**

Keep the existing `.upgrade-shop__icon { display: none; }`. Add one `.summary-screen .upgrade-shop__icon` rule that supplies absolute positioning behavior, grid centering, pointer transparency, warm-brown color, flat wood background, and a shared shadow. Give the funds well a negative local left offset; give both button wells identical local dimensions. Size every SVG through the common `.upgrade-card-icon` rule and vary only flat fill variables per icon kind.

- [ ] **Step 5: Run focused integration tests**

Run: `npm test -- --run src/components/game/UpgradeCardIcon.test.tsx src/App.test.tsx src/styles/referenceGameplayComposition.test.ts`

Expected: all focused test files pass.

- [ ] **Step 6: Commit integration**

```powershell
git add src/components/LandscapeGame.tsx src/landscape.css src/App.test.tsx src/styles/referenceGameplayComposition.test.ts
git commit -m "fix: unify summary upgrade icon styling"
```

### Task 3: Production QA and before/after comparison

**Files:**
- Create: `scripts/capture-summary-upgrade-icons-v1.mjs`
- Create: `docs/qa/screenshots/summary-upgrade-icons-v1/summary-upgrade-icons-1440x810.png`
- Create: `docs/qa/screenshots/summary-upgrade-icons-v1/qa-results.json`

**Interfaces:**
- Consumes baseline: `docs/qa/screenshots/day-retention-loop-v1/summary-next-day-1440x810.png`.
- Produces: production screenshot plus machine-readable icon geometry/style checks.

- [ ] **Step 1: Add the production QA script**

Start `vite preview` on a strict local port and launch headless Edge at 1440×810. Complete three actual Day 1 classic orders, reach the summary, verify exactly three inline SVG icons, verify no raster descendants, compare their view boxes, stroke widths, computed drop shadows, outline colors, and bounding-box dimensions, then save the screenshot and JSON evidence.

- [ ] **Step 2: Run the full automated suite**

Run: `npm test -- --run`

Expected: all test files and tests pass.

- [ ] **Step 3: Build production assets**

Run: `npm run build`

Expected: TypeScript and Vite build pass without errors.

- [ ] **Step 4: Capture and inspect the QA image**

Run: `node scripts/capture-summary-upgrade-icons-v1.mjs`

Expected: the JSON reports three same-family SVGs, zero raster icon descendants, equal stroke/shadow values, comparable dimensions, decoded images, and zero console/page errors. Visually compare the output with the baseline and confirm the old glossy money bag, sticker flame, and detailed lantern are fully concealed.

- [ ] **Step 5: Commit QA evidence**

```powershell
git add -f scripts/capture-summary-upgrade-icons-v1.mjs docs/qa/screenshots/summary-upgrade-icons-v1
git commit -m "test: verify summary upgrade icon cohesion"
```
