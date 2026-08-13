# Kitchen Spatial Alignment and Settings Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every ingredient read as content inside the background's steel-bin rack, center every cumulative food stage inside its griddle, and guarantee one visible thumb per settings slider.

**Architecture:** Introduce one shared logical kitchen geometry module consumed by rack controls, griddle rendering, gesture targets, and QA. Render cropped ingredient contents through fixed overflow-hidden slot windows instead of presenting the full generated bin silhouette at runtime. Cover the three baked slider rails with a clean visual layer and render the real range controls as the only live rails/thumbs.

**Tech Stack:** React 19, TypeScript 7, CSS, Vitest/jsdom, Sharp, Vite 8, Microsoft Edge browser QA.

## Global Constraints

- Do not change confirmed customers, night-market background, order flow, recipes, patience, heat timing, unlock progression, pricing, or BGM.
- First-day rack is the background-aligned `2 × 3` array; later-day expansion stays left of the left griddle and inside `1440 × 810`.
- Ingredient pixels must stay inside the steel-bin inner edge and may not introduce a second container outline.
- Left and right food art, drop hitboxes, gesture layers, and tutorial cues consume one geometry source.
- Sauce still requires exactly two accepted strokes; rolling still completes with one rightward swipe.
- Every settings rail shows exactly one live range thumb at minimum, middle, and maximum values.
- Preserve mouse, touch, keyboard, persistence, and reduced-motion behavior.

---

## File Structure

- Create `src/landscape/kitchen/sceneGeometry.ts`: canonical logical rack and griddle rectangles plus CSS-variable serializer.
- Create `src/landscape/kitchen/sceneGeometry.test.ts`: exact geometry, centering, bounds, and non-overlap contract.
- Create `src/assets/approved/main-ui/settings-slider-clean-patch.png`: transparent localized patch covering only the three baked rails.
- Modify `src/components/game/KitchenScene.tsx`: publish shared geometry variables and preserve unlock/routing behavior.
- Modify `src/components/game/TableIngredient.tsx`: separate slot viewport, food-content crop, and drag representation.
- Modify `src/components/game/GriddleSlot.tsx`: expose food-center diagnostics and shared inner-area semantics.
- Modify `src/styles/kitchen.css`: integrate ingredient content into physical bins and center all stage art.
- Modify `src/components/LandscapeGame.tsx`: render the clean settings-rail patch behind controlled sliders.
- Modify `src/landscape.css`: align a single real track/thumb over each cleaned rail.
- Modify `src/components/game/KitchenScene.test.tsx`: render and interaction regressions.
- Modify `src/styles/kitchen-layout.test.ts`: CSS and geometry-source regressions.
- Modify `src/App.test.tsx`: settings patch and single-control regressions.
- Modify `scripts/current-reference-screens-qa.mjs`: Edge geometry and slider duplication acceptance.

---

### Task 1: Canonical Kitchen Geometry

**Files:**
- Create: `src/landscape/kitchen/sceneGeometry.ts`
- Create: `src/landscape/kitchen/sceneGeometry.test.ts`
- Modify: `src/styles/kitchen-layout.test.ts`

**Interfaces:**
- Produces: `Rect = { left: number; top: number; width: number; height: number }`.
- Produces: `KITCHEN_GRIDDLE_RECTS: Record<SlotId, Rect>`.
- Produces: `KITCHEN_RACK_LAYOUTS: Record<'approved-2x3' | 'expanded-3x5', RackGeometry>`.
- Produces: `kitchenGeometryStyle(layout): CSSProperties` with `--griddle-*` and `--ingredient-rack-*` variables.

- [ ] **Step 1: Write failing geometry tests**

```ts
expect(KITCHEN_GRIDDLE_RECTS.left).toEqual({ left: 491, top: 559, width: 269, height: 218 })
expect(KITCHEN_GRIDDLE_RECTS.right).toEqual({ left: 760, top: 559, width: 269, height: 218 })
expect(rectCenter(KITCHEN_GRIDDLE_RECTS.left)).toEqual({ x: 625.5, y: 668 })
expect(rackRectangles('approved-2x3')).toHaveLength(6)
expect(rackRectangles('expanded-3x5').every((rect) => rect.right < 491 && rect.bottom <= 810)).toBe(true)
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/landscape/kitchen/sceneGeometry.test.ts src/styles/kitchen-layout.test.ts`

Expected: FAIL because `sceneGeometry.ts` and the exported geometry contracts do not exist.

- [ ] **Step 3: Implement the canonical geometry module**

```ts
export interface Rect { left: number; top: number; width: number; height: number }
export interface RackGeometry extends Rect { columns: number; rows: number; columnGap: number; rowGap: number }

export const KITCHEN_GRIDDLE_RECTS = {
  left: { left: 491, top: 559, width: 269, height: 218 },
  right: { left: 760, top: 559, width: 269, height: 218 },
} as const

export function rectCenter(rect: Rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}
```

Define both rack layouts from the approved plate, make `rackRectangles()` calculate every actual control rectangle, and make `kitchenGeometryStyle()` serialize exact pixel values into CSS custom properties.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/landscape/kitchen/sceneGeometry.test.ts src/styles/kitchen-layout.test.ts`

Expected: both files PASS; all rack rectangles are disjoint, in bounds, and left of the griddle.

- [ ] **Step 5: Commit**

```powershell
git add src/landscape/kitchen/sceneGeometry.ts src/landscape/kitchen/sceneGeometry.test.ts src/styles/kitchen-layout.test.ts
git commit -m "fix: centralize kitchen scene geometry"
```

---

### Task 2: Integrate Ingredients Into the Physical Rack

**Files:**
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/styles/kitchen.css`
- Modify: `src/components/game/KitchenScene.test.tsx`

**Interfaces:**
- Consumes: `KITCHEN_RACK_LAYOUTS` and `kitchenGeometryStyle()` from Task 1.
- Preserves: `onDrop(id, slotId)`, `onTapEgg()`, `onKeyboardApply(id)`, pointer capture cancellation, and sauce selection.
- Produces DOM: one `.table-ingredient__viewport` and one `.table-ingredient__food-art` per unlocked ingredient.

- [ ] **Step 1: Write failing render and interaction tests**

```tsx
expect(container.querySelectorAll('.table-ingredient__viewport')).toHaveLength(5)
expect(container.querySelectorAll('.table-ingredient__bin-art')).toHaveLength(0)
for (const control of container.querySelectorAll('.table-ingredient')) {
  expect(control.querySelectorAll(':scope > .table-ingredient__viewport > .table-ingredient__food-art')).toHaveLength(1)
}
expect(container.querySelector('.table-ingredient__ghost')?.getAttribute('src'))
  .toBe(container.querySelector('[data-ingredient-id="noodle"] .table-ingredient__food-art')?.getAttribute('src'))
```

Add a pointer-cancel test that begins a drag, observes one ghost, cancels the pointer, and observes zero ghosts. Retain sauce tests proving click/drag only selects the tool and never dispatches generic placement.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/components/game/KitchenScene.test.tsx`

Expected: FAIL because current DOM renders `.table-ingredient__bin-art` without a physical-bin viewport.

- [ ] **Step 3: Implement viewport rendering**

```tsx
<span className="table-ingredient__viewport" aria-hidden="true">
  <img className="table-ingredient__food-art" src={art} alt="" draggable={false} />
</span>
```

Publish Task 1 geometry variables on `.kitchen-scene`, keep the button as the full physical hit target, and reuse the same art source for the drag ghost. The viewport is `overflow: hidden`; the art is scaled/cropped so the generated outer metal rim is outside the visible window and only recognizable food pixels sit in the background bin.

- [ ] **Step 4: Implement embedded rack CSS**

```css
.table-ingredient__viewport {
  position: absolute;
  inset: var(--ingredient-content-inset-y) var(--ingredient-content-inset-x);
  overflow: hidden;
  border-radius: 10px;
  transform: perspective(500px) rotateX(4deg);
}
.table-ingredient__food-art {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--ingredient-crop-scale);
  height: auto;
  transform: translate(-50%, -50%);
}
```

Remove the drop-shadow that makes containers float. Tutorial highlighting stays on the physical slot outline and must not create a rounded UI tile.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/components/game/KitchenScene.test.tsx src/styles/kitchen-layout.test.ts`

Expected: PASS, including mouse/touch/keyboard/sauce and drag-cancel coverage.

- [ ] **Step 6: Commit**

```powershell
git add src/components/game/KitchenScene.tsx src/components/game/TableIngredient.tsx src/styles/kitchen.css src/components/game/KitchenScene.test.tsx
git commit -m "fix: embed ingredients in the counter rack"
```

---

### Task 3: Center Every Cooking Stage in Its Griddle

**Files:**
- Modify: `src/components/game/GriddleSlot.tsx`
- Modify: `src/components/game/CookingGestureLayer.tsx`
- Modify: `src/styles/kitchen.css`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Modify: `src/landscape/kitchen/sceneGeometry.test.ts`

**Interfaces:**
- Consumes: `KITCHEN_GRIDDLE_RECTS` and CSS variables from Task 1.
- Produces DOM diagnostics: `data-food-anchor="center"` and `data-griddle-inner-area`.
- Preserves: rolled-food click to tray, heat ring, status, cutting marks, and gesture dispatch.

- [ ] **Step 1: Write failing center-anchor tests**

```tsx
const left = container.querySelector('[data-griddle-hitbox="left"]')!
expect(left.getAttribute('data-food-anchor')).toBe('center')
expect(left.querySelector('.griddle-slot__food')?.getAttribute('data-griddle-inner-area')).toBe('left')
```

The CSS contract must assert `left: 50%`, `top: 50%`, `transform: translate(-50%, -50%)`, and one shared safe inset. Geometry tests assert visual, hitbox, gesture target, and tutorial cue rectangles are derived from the same record.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/components/game/KitchenScene.test.tsx src/landscape/kitchen/sceneGeometry.test.ts src/styles/kitchen-layout.test.ts`

Expected: FAIL because stage art currently fills a percentage inset and gesture rules duplicate independent percentages.

- [ ] **Step 3: Implement shared rect positioning and center anchor**

```css
.griddle-slot,
.cooking-gesture-target,
.tutorial-gesture-cue {
  top: var(--griddle-top);
  width: var(--griddle-width);
  height: var(--griddle-height);
}
.griddle-slot__food {
  left: 50%;
  top: 50%;
  width: calc(100% - 30px);
  height: calc(100% - 26px);
  transform: translate(-50%, -50%);
}
.griddle-slot__food img { object-fit: contain; object-position: 50% 50%; }
```

Use slot-specific shared left variables. Do not alter stage assets or completed-step selection.

- [ ] **Step 4: Verify both simultaneous griddles**

Extend the existing two-slot test so left and right each render one stage art, each reports a center anchor, and neither inherits the other slot's recipe or step.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/components/game/KitchenScene.test.tsx src/landscape/kitchen/sceneGeometry.test.ts src/styles/kitchen-layout.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/game/GriddleSlot.tsx src/components/game/CookingGestureLayer.tsx src/styles/kitchen.css src/components/game/KitchenScene.test.tsx src/landscape/kitchen/sceneGeometry.test.ts
git commit -m "fix: center cooking stages on shared griddle geometry"
```

---

### Task 4: Remove Baked Slider Thumb Duplication

**Files:**
- Create: `src/assets/approved/main-ui/settings-slider-clean-patch.png`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape.css`
- Modify: `src/App.test.tsx`
- Modify: `scripts/full-art-manifest.mjs`

**Interfaces:**
- Produces DOM: one `.settings-screen__rail-clean-patch` behind `.settings-screen__controls`.
- Preserves: `setAudioLevel('master' | 'music' | 'effects', value)` and persisted `AudioSettings`.
- Produces: exactly three `input[type="range"]`, one per setting, with no extra decorative thumb element.

- [ ] **Step 1: Write failing settings tests**

```tsx
expect(container.querySelectorAll('.settings-screen__rail-clean-patch')).toHaveLength(1)
expect(container.querySelectorAll('.settings-slider input[type="range"]')).toHaveLength(3)
expect(container.querySelectorAll('.settings-slider__decorative-thumb')).toHaveLength(0)
```

Retain the existing values/persistence test and assert the three `--settings-level` values update after keyboard input.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because no clean rail patch is rendered.

- [ ] **Step 3: Create the localized transparent patch**

Use Sharp with the approved settings image as the only source. Sample neighboring paper/rail pixels, reconstruct only the three rail rectangles, retain alpha outside them, and save one tracked PNG. Record its dimensions and role in `scripts/full-art-manifest.mjs`.

Run: `npm run validate:art`

Expected: PASS and the asset is classified in the full art manifest.

- [ ] **Step 4: Render one clean layer and three live controls**

```tsx
<img className="settings-screen__rail-clean-patch" src={settingsSliderCleanPatch} alt="" aria-hidden="true" />
<div className="settings-screen__controls">…three controlled range inputs…</div>
```

The patch sits above the baked settings plate and below the live controls. Remove heavy label-background styling that reads as a fourth control; each range owns exactly one browser thumb.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/App.test.tsx src/game/audioSettings.test.ts`

Expected: PASS; three settings still persist and synchronize with actual audio mixing.

- [ ] **Step 6: Commit**

```powershell
git add src/assets/approved/main-ui/settings-slider-clean-patch.png src/components/LandscapeGame.tsx src/landscape.css src/App.test.tsx scripts/full-art-manifest.mjs
git commit -m "fix: render one live thumb per audio slider"
```

---

### Task 5: Browser Acceptance, Regression Gates, and Release

**Files:**
- Modify: `scripts/current-reference-screens-qa.mjs`
- Create: `artifacts/spatial-alignment-qa/result.json`
- Create: `artifacts/spatial-alignment-qa/settings.png`
- Create: `artifacts/spatial-alignment-qa/day-1-empty.png`
- Create: `artifacts/spatial-alignment-qa/day-1-two-griddles.png`
- Create: `artifacts/spatial-alignment-qa/day-3.png`
- Create: `artifacts/spatial-alignment-qa/day-5.png`
- Create: `.superpowers/sdd/spatial-alignment-report.md`

**Interfaces:**
- Consumes: runtime DOM geometry, generated settings patch, and current Edge QA harness.
- Produces: checked evidence for rack containment, griddle centering, single slider thumb, interaction continuity, and zero errors.

- [ ] **Step 1: Add browser assertions before capture**

```js
assert(record.ingredients.every((item) => contains(item.viewportRect, item.visibleFoodRect)), 'food escapes bin')
assert(record.griddles.every((slot) => Math.abs(slot.foodCenter.x - slot.innerCenter.x) <= 2), 'food not centered')
assert(record.settings.sliders.every((slider) => slider.liveThumbCount === 1), 'duplicate slider thumb')
```

Also assert zero rack/griddle, rack/tutorial, left/right food, and viewport overlaps; exact Day 1/3/5 unlocked counts remain `5/11/15`.

- [ ] **Step 2: Run focused and full automated gates**

```powershell
npm test -- --run src/landscape/kitchen/sceneGeometry.test.ts src/styles/kitchen-layout.test.ts src/components/game/KitchenScene.test.tsx src/App.test.tsx
npm run validate:art
npm test -- --run
npm run build
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 3: Run real Edge acceptance at 1440 × 810**

Run: `node scripts/current-reference-screens-qa.mjs`

Inspect at original detail:

- settings at minimum, middle, and maximum values;
- Day 1 empty rack;
- Day 1 with both griddles holding centered food;
- Day 3 expanded rack;
- Day 5 full rack.

Expected: no floating container silhouette, clipping, overlap, off-center food, duplicate thumb, console error, or page error.

- [ ] **Step 4: Write report and commit evidence**

The report must record exact test totals, art totals, build filenames, screenshot paths, geometry measurements, and any remaining concern. Do not claim deployment before it is verified.

```powershell
git add scripts/current-reference-screens-qa.mjs artifacts/spatial-alignment-qa .superpowers/sdd/spatial-alignment-report.md
git commit -m "test: accept corrected kitchen spatial composition"
```

- [ ] **Step 5: Push and verify GitHub Pages**

Push `main`, wait for the workflow attached to the new commit to finish successfully, request the public page with HTTP 200, and verify remote JS/CSS asset names match the local `dist/index.html` names before returning the live URL.

---

## Plan Self-Review

- Spec coverage: physical rack integration, later-day expansion, shared griddle geometry, center anchoring, two-griddle concurrency, sauce/roll simplicity, settings single-thumb behavior, keyboard/touch/persistence, Edge screenshots, full gates, and deployment verification are each assigned to a task.
- Completeness scan: every code change has a concrete file, command, expected result, and commit boundary.
- Type consistency: Task 1 exports `Rect`, `RackGeometry`, `KITCHEN_GRIDDLE_RECTS`, `KITCHEN_RACK_LAYOUTS`, `rackRectangles()`, `rectCenter()`, and `kitchenGeometryStyle()`; every later task consumes those same names.
