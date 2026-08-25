# Visual System Unification V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align every non-character screen with the accepted home-screen night-market wood-and-paper visual system without changing layout, gameplay, or character assets.

**Architecture:** Extend the existing `src/landscape.css` token layer, then apply localized CSS material skins to the current DOM and approved raster plates. The 1440×810 logical gameplay geometry remains untouched; only its outer ambient background and HUD surface rendering change. A production Edge runner captures the same real flow before and after and verifies character freeze by Git path diff from `36214b8`.

**Tech Stack:** React 19, TypeScript, CSS custom properties, Vitest, Vite production preview, Playwright with Microsoft Edge, Sharp.

## Global Constraints

- Character assets and all character code/geometry are frozen at commit `36214b8`.
- Do not modify gameplay, cooking geometry, touch hitboxes, campaign, progression, economy, upgrades, storage, or state management.
- Do not generate or edit raster page backgrounds.
- Preserve the existing Day/Orders/Coins/Pause/Sound HUD information and positions.
- Preserve the six Day cards, summary layout, settings controls, and approved upgrade SVG drawings.
- Reference viewports are exactly 1440×810 and 844×390; rotate-prompt evidence is 390×844.

---

### Task 1: Establish the home-derived token contract and warm gameplay ambient extension

**Files:**
- Modify: `src/landscape.css`
- Modify: `src/components/LandscapeGame.tsx`
- Create: `src/styles/visualSystemUnification.test.ts`

**Interfaces:**
- Consumes: existing `cleanKitchenScreen` URL and `--game-bg` logical-scene variable.
- Produces: root custom properties `--night-bg`, `--night-warm-edge`, `--wood-dark`, `--wood-mid`, `--wood-light`, `--gold-border`, `--paper-cream`, `--paper-aged`, `--warm-highlight`, `--ink-dark`, `--shadow-warm`, `--panel-radius`, `--panel-border`, `--panel-shadow`; `.game-screen` inline property `--game-ambient-bg`.

- [ ] **Step 1: Write the failing token and ambient-background contract**

```ts
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const cssPath = path.join(process.cwd(), 'src', 'landscape.css')

describe('home-derived visual system', () => {
  it('defines the shared night-market material tokens', async () => {
    const css = await readFile(cssPath, 'utf8')
    for (const token of ['night-bg', 'night-warm-edge', 'wood-dark', 'wood-mid', 'wood-light', 'gold-border', 'paper-cream', 'paper-aged', 'warm-highlight', 'ink-dark', 'shadow-warm', 'panel-radius', 'panel-border', 'panel-shadow']) {
      expect(css).toContain(`--${token}:`)
    }
  })

  it('uses an approved scene extension instead of a flat blue game-screen background', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toMatch(/\.game-screen::before\s*\{[^}]*background-image:\s*var\(--game-ambient-bg\)[^}]*blur/s)
    expect(css).not.toMatch(/\.game-screen\s*\{[^}]*background:\s*#101a2c;/s)
  })
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run --config vitest.config.ts src/styles/visualSystemUnification.test.ts`

Expected: FAIL because the new tokens and `.game-screen::before` contract are absent.

- [ ] **Step 3: Add the material tokens and ambient scene URL**

Add the exact token family to `:root`, preserve current aliases, add `style={{ '--game-ambient-bg': \`url(${kitchenScreen})\` } as React.CSSProperties}` to the gameplay `<main>`, and render `.game-screen::before` as a blurred, scaled, brightness-reduced, warm-tinted cover layer. Keep `.game-screen__safe-viewport` above it and do not alter `fitGameplayScene()`.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run --config vitest.config.ts src/styles/visualSystemUnification.test.ts src/landscape/useGameplayViewport.test.tsx src/styles/kitchen-layout.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```text
git add src/landscape.css src/components/LandscapeGame.tsx src/styles/visualSystemUnification.test.ts
git commit -m "style: unify gameplay viewport with night market visual system"
```

### Task 2: Align the gameplay HUD with the home wood-sign family

**Files:**
- Modify: `src/landscape.css`
- Modify: `src/styles/visualSystemUnification.test.ts`
- Test: `src/components/game/GameplayHud.test.tsx`

**Interfaces:**
- Consumes: Task 1 material tokens and existing `.gameplay-hud*` classes.
- Produces: shared deep-wood shell, gold edge, parchment order core, and consistent hover/active/focus states without DOM changes.

- [ ] **Step 1: Extend the failing CSS contract**

```ts
it('skins the fixed HUD geometry with the shared wood and paper tokens', async () => {
  const css = await readFile(cssPath, 'utf8')
  expect(css).toMatch(/\.gameplay-hud button,\s*\.gameplay-hud__orders,\s*\.gameplay-hud__coins\s*\{[^}]*var\(--wood-dark\)[^}]*var\(--gold-border\)[^}]*var\(--panel-shadow\)/s)
  expect(css).toMatch(/\.gameplay-hud__orders\s*\{[^}]*var\(--paper-aged\)/s)
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run --config vitest.config.ts src/styles/visualSystemUnification.test.ts`

Expected: FAIL because HUD surfaces still use the pale standalone gradient.

- [ ] **Step 3: Replace only HUD material declarations**

Keep every left/right/top/width/height/padding value unchanged. Replace surface colors, border colors, text shadows and box shadows with Task 1 tokens; give Orders a parchment inner surface; use the same left-top highlight and downward warm shadow on Day, Coins, Pause and Sound.

- [ ] **Step 4: Verify structure and styles**

Run: `npx vitest run --config vitest.config.ts src/styles/visualSystemUnification.test.ts src/components/game/GameplayHud.test.tsx`

Expected: PASS with Day/Orders/Coins/Pause/Sound still the only HUD information.

- [ ] **Step 5: Commit**

```text
git add src/landscape.css src/styles/visualSystemUnification.test.ts
git commit -m "style: align gameplay hud with home screen"
```

### Task 3: Warm and deepen the Day-select panel system

**Files:**
- Modify: `src/landscape.css`
- Modify: `src/styles/visualSystemUnification.test.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: existing `.day-card`, `.is-locked`, `.day-card__stars`, `.day-hotspot__status` and approved `UpgradeCardIcon` DOM.
- Produces: localized warm-paper tint and wood inset layers that do not change card or hotspot bounds.

- [ ] **Step 1: Add a failing Day-card material contract**

```ts
it('warms Day cards and dims locks without flattening the approved plate', async () => {
  const css = await readFile(cssPath, 'utf8')
  expect(css).toMatch(/\.day-card::before\s*\{[^}]*var\(--paper-aged\)[^}]*inset/s)
  expect(css).toMatch(/\.day-card\.is-locked::before\s*\{[^}]*brightness\(\.78\)[^}]*saturate\(\.62\)/s)
  expect(css).toMatch(/\.day-card__stars,[^}]*background:\s*var\(--paper-aged\)/s)
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run --config vitest.config.ts src/styles/visualSystemUnification.test.ts src/App.test.tsx`

Expected: visual-system contract FAIL; existing App selection/progression tests PASS.

- [ ] **Step 3: Add non-interactive card tint layers**

Add pointer-events-none pseudo-elements inside existing Day hotspots, use a subtle multiply-like warm paper tint and inset wood edge, lower locked-card brightness/saturation without adding a gray rectangle, and update dynamic paper masks to `--paper-aged`. Do not modify `.day-card--N` coordinates or the upgrade SVG selectors.

- [ ] **Step 4: Verify selection and progression remain unchanged**

Run: `npx vitest run --config vitest.config.ts src/styles/visualSystemUnification.test.ts src/App.test.tsx src/landscape/progression.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```text
git add src/landscape.css src/styles/visualSystemUnification.test.ts
git commit -m "style: unify day select panels"
```

### Task 4: Harmonize summary, settings, common panels and rotate prompt

**Files:**
- Modify: `src/landscape.css`
- Modify: `src/styles/visualSystemUnification.test.ts`
- Test: `src/App.test.tsx`
- Test: `src/components/game/AccessibleDialog.test.tsx`

**Interfaces:**
- Consumes: existing summary plate/card selectors, settings range selectors, modal selectors, `.rotate-device`, and Task 1 tokens.
- Produces: warm parchment summary tint, wood-edged stat cards, shared settings/control materials, and safe-area wood-sign rotate prompt.

- [ ] **Step 1: Add failing cross-screen material contracts**

```ts
it('uses the shared materials on summary, settings, modal and rotate surfaces', async () => {
  const css = await readFile(cssPath, 'utf8')
  expect(css).toMatch(/\.summary-card::before\s*\{[^}]*var\(--paper-aged\)[^}]*var\(--gold-border\)/s)
  expect(css).toMatch(/\.summary-stats > div::before\s*\{[^}]*var\(--paper-aged\)[^}]*inset/s)
  expect(css).toMatch(/\.settings-slider input\s*\{[^}]*var\(--gold-border\)[^}]*var\(--wood-mid\)/s)
  expect(css).toMatch(/\.menu-modal,[\s\S]*\.abandon-modal\s*\{[^}]*var\(--paper-aged\)[^}]*var\(--panel-shadow\)/s)
  expect(css).toMatch(/\.rotate-device::before\s*\{[^}]*var\(--wood-dark\)[^}]*var\(--gold-border\)[^}]*env\(safe-area-inset/s)
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run --config vitest.config.ts src/styles/visualSystemUnification.test.ts`

Expected: FAIL for the four new material contracts.

- [ ] **Step 3: Apply localized summary and settings skins**

Add a pointer-events-none warm parchment tint inside the existing central summary board and each stat card; use inset wood/gold edges without moving any card. Convert current summary dynamic masks, settings rails/thumbs, modal panels and shared focus glow to Task 1 tokens. Keep the three approved upgrade SVGs byte-for-byte unchanged.

- [ ] **Step 4: Build the safe-area rotate wood sign**

Keep the current `GameIcon name="roll"` and Chinese prompt. Use `.rotate-device::before` as a centered deep-wood plaque with gold edge and parchment inner glow; keep content above it, preserve all four safe-area paddings, and do not reveal hidden gameplay controls in portrait.

- [ ] **Step 5: Verify UI behavior**

Run: `npx vitest run --config vitest.config.ts src/styles/visualSystemUnification.test.ts src/App.test.tsx src/components/game/AccessibleDialog.test.tsx src/game/audioSettings.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```text
git add src/landscape.css src/styles/visualSystemUnification.test.ts
git commit -m "style: harmonize summary and settings visuals"
```

### Task 5: Capture cross-screen before/after production QA

**Files:**
- Modify: `scripts/capture-full-visual-consistency-v1.mjs`
- Create: `scripts/capture-visual-system-unification-v1.mjs`
- Create at runtime: `docs/qa/screenshots/visual-system-unification-v1/*`
- Create: `docs/qa/visual-system-unification-v1.md`

**Interfaces:**
- Consumes: baseline `docs/qa/screenshots/full-visual-consistency-v1/` and the existing real-flow capture helpers.
- Produces: after screenshots, desktop/mobile contact sheets, combined before/after sheets, diagnostics JSON and answers A–E.

- [ ] **Step 1: Make the existing runner output-directory configurable**

Add:

```js
const qaOutputName = process.env.FULL_VISUAL_QA_OUTPUT ?? 'full-visual-consistency-v1'
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', qaOutputName)
```

Keep the default unchanged so the previous QA remains reproducible.

- [ ] **Step 2: Add the visual-system wrapper**

Create `scripts/capture-visual-system-unification-v1.mjs` that sets `FULL_VISUAL_QA_OUTPUT=visual-system-unification-v1`, imports the full-flow runner, then uses Sharp to stack the baseline and final contact sheets into `before-after-1440x810.png` and `before-after-844x390.png`.

- [ ] **Step 3: Build and run real production flows**

Run:

```text
npm run build
node scripts/capture-visual-system-unification-v1.mjs
```

Expected: 17 source screenshots, 2 final contact sheets, 2 before/after sheets, zero clipped elements, zero overflow, zero console errors and zero page errors.

- [ ] **Step 4: Write the QA report**

Report page-level before/after, P0/P1/P2, tests/build, and exact answers:

```text
A: NO — gameplay uses warm blurred scene extension instead of pure blue bars.
B: YES — home, select, HUD, summary and settings share wood/gold/paper/shadow/highlight tokens.
C: NO — visible control icons use the accepted SVG families; rating stars remain styled semantic text.
D: NO — no page remains materially whiter or flatter than the home reference.
E: YES — Character assets modified: NO.
```

- [ ] **Step 5: Commit**

```text
git add scripts/capture-full-visual-consistency-v1.mjs scripts/capture-visual-system-unification-v1.mjs
git add -f docs/qa/visual-system-unification-v1.md docs/qa/screenshots/visual-system-unification-v1
git commit -m "test: add cross-screen visual qa"
```

### Task 6: Final regression and frozen-scope audit

**Files:**
- Read: Git diff from `36214b8`
- Update: `docs/qa/visual-system-unification-v1.md`

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: verified final report and clean scoped branch.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Run the final production build**

Run: `npm run build`

Expected: Vite build succeeds with 453 modules transformed unless source graph count changes only because of test-only files, which are not bundled.

- [ ] **Step 3: Verify frozen files and logic**

Run:

```text
git diff --name-only 36214b8..HEAD
git diff --name-only 36214b8..HEAD -- src/assets/runtime/customers src/assets/runtime/events src/landscape/campaign.ts src/landscape/progression.ts src/landscape/kitchen
```

Expected: the second command prints nothing.

- [ ] **Step 4: Verify final screenshot manifest and diagnostics**

Run: `node -e "const r=require('./docs/qa/screenshots/visual-system-unification-v1/qa-results.json'); if(r.screenshots.length!==17||r.consoleErrors.length||r.pageErrors.length||r.screenshots.some(s=>s.clipped.length||s.bodyOverflow.horizontal||s.bodyOverflow.vertical)) process.exit(1); console.log('visual QA passed')"`

Expected: `visual QA passed`.

- [ ] **Step 5: Finalize report and commit**

Add actual test/build counts and the three exact freeze confirmations, then run:

```text
git add -f docs/qa/visual-system-unification-v1.md
git commit -m "docs: finalize visual system unification report"
```

