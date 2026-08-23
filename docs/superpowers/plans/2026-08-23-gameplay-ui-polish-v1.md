# Gameplay UI Polish V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refocus the kitchen screen on customers, visual orders, and the griddle while adding clear non-blocking cooking feedback without changing gameplay rules or coordinates.

**Architecture:** Keep the existing kitchen reducer, queue, campaign, gesture, storage, and 1440×810 geometry as the source of truth. Replace the baked gameplay HUD with focused presentation components, derive all new visuals from existing state, and compose the approved clean background with the expanded rack at runtime.

**Tech Stack:** React 19, TypeScript 7, CSS, Vite 8, Vitest 3, JSDOM, Playwright 1.62.

## Global Constraints

- Keep all visible gameplay copy Chinese.
- Do not change campaign progression, recipe rules, difficulty, order counts, income values, save keys, or cooking/gesture coordinates.
- Keep the illustrated warm night-market style; no SaaS cards, glassmorphism, neon technology styling, Material Design, or system emoji.
- Use reusable inline SVG/CSS placeholder icons and existing approved PNG art only.
- Preserve 2×3 and 3×5 ingredient rack layouts.
- Preserve the portrait rotate-device behavior.
- Reference viewports are exactly 1440×810 and 844×390.
- Work only on `codex/gameplay-ui-polish-v1`; do not merge `main`.
- Preserve the user's untracked `output/` directory.

---

## File Structure

- Create `src/components/game/GameIcon.tsx`: shared typed inline-SVG icons.
- Create `src/components/game/GameplayHud.tsx`: compact gameplay-only HUD.
- Create `src/components/game/OrderBubble.tsx`: ingredient order, modifiers, and patience.
- Create `src/components/game/CookingFeedback.tsx`: local cooking transition cues.
- Create `src/components/game/DeliveryFeedback.tsx`: timed income/quality toast.
- Create `src/components/game/TutorialOverlay.tsx`: concise tutorial copy and SVG/CSS gesture cues.
- Modify `src/components/LandscapeGame.tsx`: clean background composition, new HUD, and delivery feedback ownership.
- Modify `src/components/game/CustomerLane.tsx`: delegate bubble rendering and mark critical customer.
- Modify `src/components/game/KitchenScene.tsx`: integrate tutorial and cooking feedback components.
- Modify `src/components/game/GriddleSlot.tsx`: expose presentation data attributes.
- Modify `src/components/game/TableIngredient.tsx`: stateful interaction styling hooks.
- Modify `src/styles/kitchen.css`: order, patience, griddle, ingredient, feedback, and tutorial styles.
- Modify `src/landscape.css`: compact HUD and clean background overlay styles.
- Modify `src/App.test.tsx` and `src/components/game/KitchenScene.test.tsx`: update gameplay contracts.
- Create focused component tests beside the new components.
- Create `docs/qa/screenshots/gameplay-ui-polish-v1/`: final QA evidence and result metadata.

### Task 1: Clean background, shared icons, and compact HUD

**Files:**
- Create: `src/components/game/GameIcon.tsx`
- Create: `src/components/game/GameIcon.test.tsx`
- Create: `src/components/game/GameplayHud.tsx`
- Create: `src/components/game/GameplayHud.test.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape.css`

**Interfaces:**
- Produces: `GameIcon({ name, title?, className? }: { name: GameIconName; title?: string; className?: string }): JSX.Element`
- Produces: `GameplayHud({ day, coins, served, target, sound, onHome, onPause, onSound }: GameplayHudProps): JSX.Element`
- Consumes: existing `DayConfig`, `CampaignSave`, sound callback, menu callback, and clean/expanded background imports.

- [ ] **Step 1: Write failing icon and HUD tests**

```tsx
expect(renderToStaticMarkup(<GameIcon name="coin" />)).toContain('<svg')
expect(renderToStaticMarkup(<GameplayHud day={1} coins={36} served={2} target={5} sound onHome={noop} onPause={noop} onSound={noop} />)).toContain('订单 2/5')
expect(markup).not.toMatch(/😊|💵|☾|♪|Ⅱ/)
```

- [ ] **Step 2: Run focused tests and verify the new modules are missing**

Run: `npm test -- --run src/components/game/GameIcon.test.tsx src/components/game/GameplayHud.test.tsx`

Expected: FAIL because `GameIcon.tsx` and `GameplayHud.tsx` do not exist.

- [ ] **Step 3: Implement the typed SVG icon map and compact HUD**

```tsx
export type GameIconName = 'coin' | 'pause' | 'sound-on' | 'sound-off' | 'trash' | 'hand' | 'heat' | 'cut' | 'roll' | 'extra' | 'without'

export function GameIcon({ name, title, className }: GameIconProps) {
  return <svg className={`game-icon${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>{title && <title>{title}</title>}{ICON_PATHS[name]}</svg>
}
```

```tsx
<header className="gameplay-hud">
  <button className="gameplay-hud__day" onClick={onHome}>第 {day} 天</button>
  <div className="gameplay-hud__orders"><b>订单 {served}/{target}</b><i><span style={{ width: `${served / target * 100}%` }} /></i></div>
  <div className="gameplay-hud__coins"><GameIcon name="coin" /><b>¥{coins}</b></div>
  <button className="gameplay-hud__control" onClick={onPause} aria-label="暂停并打开菜单"><GameIcon name="pause" /></button>
  <button className="gameplay-hud__control" onClick={onSound} aria-label={sound ? '关闭音乐' : '开启音乐'}><GameIcon name={sound ? 'sound-on' : 'sound-off'} /></button>
</header>
```

- [ ] **Step 4: Replace `TopHud` and compose the clean background**

Render `night-market-clean-background.png` as the primary image. When `expandedRack` is true, render `kitchen-screen-live-expanded-clean.png` as a second full-scene image with `clip-path: inset(54% 0 0 0)` so only the approved 3×5 lower rack replaces the clean 2×3 lower rack.

- [ ] **Step 5: Run focused and application tests**

Run: `npm test -- --run src/components/game/GameIcon.test.tsx src/components/game/GameplayHud.test.tsx src/App.test.tsx`

Expected: PASS with the updated compact HUD assertions.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/GameIcon.tsx src/components/game/GameIcon.test.tsx src/components/game/GameplayHud.tsx src/components/game/GameplayHud.test.tsx src/components/LandscapeGame.tsx src/landscape.css src/App.test.tsx
git commit -m "refactor: simplify gameplay hud"
```

### Task 2: Ingredient-based order bubbles and patience severity

**Files:**
- Create: `src/components/game/OrderBubble.tsx`
- Create: `src/components/game/OrderBubble.test.tsx`
- Modify: `src/components/game/CustomerLane.tsx`
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/styles/kitchen.css`
- Modify: `src/components/game/KitchenScene.test.tsx`

**Interfaces:**
- Produces: `recipeOrderIngredients(recipeId: RecipeId): Array<{ id: IngredientId; label: string; art: string }>`
- Produces: `OrderBubble({ customer, pose, critical }: { customer: CustomerState; pose: OrderBubblePose; critical: boolean }): JSX.Element`
- Consumes: `RECIPES`, `ingredientForCookingStep`, `ingredientFoodArt`, existing order modifiers, and `layoutOrderBubbles`.

- [ ] **Step 1: Write failing order-content and critical-patience tests**

```tsx
expect(recipeOrderIngredients('classic').map(({ id }) => id)).toEqual(['noodle', 'egg', 'hot-dog', 'sauce', 'scallion'])
expect(markup).toContain('data-order-ingredient="noodle"')
expect(markup).toContain('data-patience-level="critical"')
expect(markup).not.toContain('🌶')
```

- [ ] **Step 2: Run the focused tests**

Run: `npm test -- --run src/components/game/OrderBubble.test.tsx src/components/game/KitchenScene.test.tsx`

Expected: FAIL because `OrderBubble` and ingredient-level markup do not exist.

- [ ] **Step 3: Implement visual ingredient derivation and modifiers**

Filter recipe steps through `ingredientForCookingStep(step)`, preserve order and repetitions, and render approved food PNGs. Render heat, extra, and without marks with `GameIcon`; keep full Chinese names in `aria-label` and visually hidden text.

- [ ] **Step 4: Derive patience level and critical customer**

```ts
const ratio = Math.max(0, customer.patienceMs / customer.maxPatienceMs)
const level = ratio <= .2 ? 'critical' : ratio <= .45 ? 'warning' : 'steady'
const criticalId = activeCustomers.reduce((lowest, customer) => customer.patienceMs < lowest.patienceMs ? customer : lowest).id
```

Pass `critical={customer.id === criticalId && ratio <= .3}` to `CustomerLane` and then `OrderBubble`.

- [ ] **Step 5: Style bubble grid and patience feedback without moving lanes**

Use compact ingredient tiles, a 7px patience track, green/amber/red variables, and a border-only critical pulse. Keep `--customer-bubble-x`, `--customer-bubble-y`, and `--customer-bubble-tail-x` unchanged.

- [ ] **Step 6: Run focused tests and geometry tests**

Run: `npm test -- --run src/components/game/OrderBubble.test.tsx src/components/game/KitchenScene.test.tsx src/landscape/kitchen/orderBubbleLayout.test.ts src/landscape/kitchen/sceneGeometry.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/game/OrderBubble.tsx src/components/game/OrderBubble.test.tsx src/components/game/CustomerLane.tsx src/components/game/KitchenScene.tsx src/styles/kitchen.css src/components/game/KitchenScene.test.tsx
git commit -m "feat: improve visual order bubbles"
```

### Task 3: Cooking-stage and delivery feedback

**Files:**
- Create: `src/components/game/CookingFeedback.tsx`
- Create: `src/components/game/CookingFeedback.test.tsx`
- Create: `src/components/game/DeliveryFeedback.tsx`
- Create: `src/components/game/DeliveryFeedback.test.tsx`
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/game/GriddleSlot.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/styles/kitchen.css`

**Interfaces:**
- Produces: `CookingFeedback({ slots }: { slots: KitchenState['slots'] }): JSX.Element`
- Produces: `DeliveryFeedback({ feedback }: { feedback: { id: number; income: number; quality: number } | null }): JSX.Element | null`
- Produces: `qualityLabel(quality: number): '完美' | '很好' | '可以'`
- Consumes: existing slot phases, completed steps, heat state, sauce strokes, cut indices, deliveries, and `incomeForDelivery`.

- [ ] **Step 1: Write failing quality and state-transition tests**

```tsx
expect(qualityLabel(95)).toBe('完美')
expect(qualityLabel(82)).toBe('很好')
expect(qualityLabel(60)).toBe('可以')
expect(renderToStaticMarkup(<DeliveryFeedback feedback={{ id: 1, income: 9, quality: 95 }} />)).toContain('+¥9')
```

- [ ] **Step 2: Run focused tests**

Run: `npm test -- --run src/components/game/CookingFeedback.test.tsx src/components/game/DeliveryFeedback.test.tsx`

Expected: FAIL because the feedback modules do not exist.

- [ ] **Step 3: Implement non-blocking slot feedback**

Track previous phase, heat state, completed step count, sauce strokes, and cut count in refs. Emit keyed transient markers for `place`, `egg`, `ready`, `sauce`, `cut`, `roll`, and `pack`, with slot-local classes and automatic 700ms removal. Set `aria-hidden="true"` and `pointer-events: none`.

- [ ] **Step 4: Implement delivery feedback ownership**

When `KitchenDaySession` observes a newly appended `DeliveryRecord`, compute its existing income, call the existing coin callback, set `{ id, income, quality }`, and clear it after 1,000ms. This does not alter the delivery, coin, or quality calculation.

- [ ] **Step 5: Strengthen stage styles**

Slightly enlarge stage art inside the current slot, make sauce sheen and cut marks more visible, and add local animations for settle, egg spread, ready glow, cut nudge, roll, and pack. Add reduced-motion overrides.

- [ ] **Step 6: Run feedback, service, reducer, and audio tests**

Run: `npm test -- --run src/components/game/CookingFeedback.test.tsx src/components/game/DeliveryFeedback.test.tsx src/landscape/kitchen/service.test.ts src/landscape/kitchen/reducer.test.ts src/game/audio.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/game/CookingFeedback.tsx src/components/game/CookingFeedback.test.tsx src/components/game/DeliveryFeedback.tsx src/components/game/DeliveryFeedback.test.tsx src/components/game/KitchenScene.tsx src/components/game/GriddleSlot.tsx src/components/LandscapeGame.tsx src/styles/kitchen.css
git commit -m "feat: enhance cooking interaction feedback"
```

### Task 4: Concise tutorial and ingredient/button states

**Files:**
- Create: `src/components/game/TutorialOverlay.tsx`
- Create: `src/components/game/TutorialOverlay.test.tsx`
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/styles/kitchen.css`
- Modify: `src/landscape.css`

**Interfaces:**
- Produces: `TutorialOverlay({ state, sauceSelected }: { state: KitchenState; sauceSelected: boolean }): JSX.Element | null`
- Consumes: `tutorialStep`, `tutorialInstruction`, `tutorialGesturePath`, `tutorialSvgPath`, `nextCutTargetIndex`, and `GameIcon`.

- [ ] **Step 1: Write failing concise-copy and emoji-removal tests**

```tsx
expect(markup).toContain('拖面皮到铁板')
expect(markup).not.toContain('第一步')
expect(markup).not.toMatch(/☝|🍳|🗑|🔪/)
```

- [ ] **Step 2: Run focused tutorial tests**

Run: `npm test -- --run src/components/game/TutorialOverlay.test.tsx src/landscape/kitchen/tutorial.test.ts`

Expected: FAIL because `TutorialOverlay` does not exist and old emoji markup remains.

- [ ] **Step 3: Extract and simplify tutorial presentation**

Render one short instruction, target highlight, existing SVG path, and `GameIcon name="hand"` where a hand cue is needed. Keep `role="status"`, the current reducer state, and the 2.2-second tutorial completion toast.

- [ ] **Step 4: Replace remaining gameplay emoji and expose interaction states**

Replace trash, cut/roll tool, and tutorial symbols with `GameIcon`. Add `data-interaction-state`, pressed/selected hooks, `:hover`, `:active`, `:focus-visible`, and `:disabled` styles to ingredient and gameplay controls. Do not modify summary-page emoji because summary redesign is explicitly out of scope.

- [ ] **Step 5: Run tutorial, gesture, rack, and application tests**

Run: `npm test -- --run src/components/game/TutorialOverlay.test.tsx src/landscape/kitchen/tutorial.test.ts src/landscape/kitchen/tutorialPaths.test.ts src/landscape/kitchen/gestures.test.ts src/styles/kitchen-layout.test.ts src/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/TutorialOverlay.tsx src/components/game/TutorialOverlay.test.tsx src/components/game/KitchenScene.tsx src/components/game/TableIngredient.tsx src/styles/kitchen.css src/landscape.css src/App.test.tsx
git commit -m "feat: simplify guided tutorial presentation"
```

### Task 5: Gameplay UI regression coverage and QA fixtures

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Modify: `src/landscape/kitchen/state.ts` only if a development-only deterministic fixture cannot be composed at the application boundary.
- Create: `scripts/capture-gameplay-ui-polish-v1.mjs`

**Interfaces:**
- Produces: development-only query fixtures for initial, customer, cooking, multi-customer, dual-griddle, expanded-rack, delivery-feedback, and low-patience states.
- Produces: deterministic Playwright capture script targeting 1440×810 and 844×390.

- [ ] **Step 1: Add regression assertions before fixture changes**

Assert compact HUD, clean background marker, ingredient order tiles, critical patience marker, feedback layer, tutorial short copy, two-slot geometry, and the absence of forbidden gameplay emoji.

- [ ] **Step 2: Run application and kitchen tests**

Run: `npm test -- --run src/App.test.tsx src/components/game/KitchenScene.test.tsx`

Expected: PASS for implemented UI behavior; fixture-specific screenshot states may still be unavailable.

- [ ] **Step 3: Add development-only QA states and capture script**

The script starts or reuses Vite, opens deterministic URLs only when `import.meta.env.DEV` is true, waits for `document.fonts.ready` and live-customer markers, then captures the required filenames. Production builds ignore all fixture query parameters.

- [ ] **Step 4: Run the full automated suite**

Run: `npm test`

Expected: all Vitest files pass.

- [ ] **Step 5: Run the build**

Run: `npm run build`

Expected: `tsc -b && vite build` exits 0. There is no separate `typecheck` script; TypeScript checking is part of `build`.

- [ ] **Step 6: Commit**

```bash
git add src/App.test.tsx src/components/game/KitchenScene.test.tsx scripts/capture-gameplay-ui-polish-v1.mjs
git commit -m "test: add gameplay ui regression coverage"
```

### Task 6: Visual QA and final evidence

**Files:**
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/day1-initial-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/first-customer-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/cooking-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/two-customers-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/two-griddles-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/expanded-rack-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/delivery-feedback-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/low-patience-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/mobile-landscape-844x390.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v1/qa-results.json`

**Interfaces:**
- Consumes: `scripts/capture-gameplay-ui-polish-v1.mjs`.
- Produces: committed visual evidence and exact viewport/result metadata.

- [ ] **Step 1: Capture all required states**

Run: `node scripts/capture-gameplay-ui-polish-v1.mjs`

Expected: nine PNGs and `qa-results.json` are created under the exact directory above.

- [ ] **Step 2: Inspect every screenshot**

Check that HUD never overlaps a face or bubble, order ingredients are legible, both griddles preserve hitbox alignment, expanded rack bins contain their art, feedback is visible without blocking controls, low patience is immediately identifiable, and 844×390 has no clipping or overlap.

- [ ] **Step 3: Re-run final verification**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 4: Commit QA evidence**

```bash
git add -f docs/qa/screenshots/gameplay-ui-polish-v1
git commit -m "test: capture gameplay ui visual qa"
```

- [ ] **Step 5: Confirm branch and user files**

Run: `git status --short --branch`

Expected: branch is `codex/gameplay-ui-polish-v1`; only the pre-existing untracked `output/` remains.
