# English Title Plaque Neutralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining rectangular pasted-overlay appearance from four English title regions while preserving the original ornamental plaques.

**Architecture:** Keep the existing locale-only DOM text nodes as transparent positioning layers. Replace their opaque wood faces with small pseudo-element texture masks that cover only baked glyph zones and fade irregularly into the source art; change only the raw noodle ingredient label in the English dictionary.

**Tech Stack:** React 19, TypeScript, CSS masks/gradients, Vitest, Playwright, Sharp, Vite.

## Global Constraints

- Modify only Home main title, Settings game-title plaque, Day Select title, Summary `Day Complete` heading, and English `ingredient.noodle` copy.
- Do not modify characters, gameplay, layout, day cards, order bubbles, tutorial, summary data, upgrades, or buttons.
- Do not add opaque rectangular title panels or new raster assets.
- Generate only four English 1440×810 QA screenshots.
- Preserve the untracked `output/` directory.

---

### Task 1: Add Neutral-title Style Contracts

**Files:**
- Modify: `src/styles/englishVisualPolish.test.ts`

**Interfaces:**
- Consumes: existing locale title selectors in `src/landscape.css`.
- Produces: contracts requiring transparent title containers and feathered pseudo-element masks.

- [ ] **Step 1: Add failing assertions**

Require the shared Home/Settings title rule, Day Select title rule, and Summary heading rule to contain `background: transparent`, `border: 0`, and `box-shadow: none`. Require matching `::before` selectors with `mask-image` or `-webkit-mask-image`, and reject `background: var(--wood-grain-en)` on the four title containers.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- --run src/styles/englishVisualPolish.test.ts`

Expected: FAIL because the current title containers still use borders, shadows, and opaque wood backgrounds.

- [ ] **Step 3: Commit together with Task 2**

The test and implementation form one reviewable visual correction and are committed after the focused test passes.

### Task 2: Neutralize the Four Plaque Interiors

**Files:**
- Modify: `src/landscape.css`
- Test: `src/styles/englishVisualPolish.test.ts`

**Interfaces:**
- Consumes: `.home-screen__locale-title`, `.settings-screen__game-title`, `.select-screen__locale-title`, and `.summary-screen__locale-heading` DOM nodes.
- Produces: transparent positioning layers and their `::before` neutral texture masks.

- [ ] **Step 1: Make Home and Settings containers transparent**

Remove their border, radius, opaque background, box shadow, padding-driven panel appearance, and overflow clipping. Keep current sign-aligned bounding boxes only for text placement. Add a shared `::before` pseudo-element behind the text with an irregular polygon/ellipse, layered warm wood texture, and feathered mask edges limited to the baked title glyph zone.

- [ ] **Step 2: Make Day Select title transparent**

Retain the existing title/subtitle position and hierarchy. Remove the container board styling and use a smaller irregular `::before` neutral mask inside the original top sign.

- [ ] **Step 3: Make Summary heading transparent**

Remove the replacement-board border/background/shadow. Add a compact feathered neutral mask confined inside the original hanging gold-edged title seat.

- [ ] **Step 4: Run the focused contract**

Run: `npm test -- --run src/styles/englishVisualPolish.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/landscape.css src/styles/englishVisualPolish.test.ts
git commit -m "fix: integrate english titles into original plaques"
```

### Task 3: Correct the Raw Noodle Ingredient Label

**Files:**
- Modify: `src/i18n/en.ts`
- Test: `src/i18n/core.test.ts`

**Interfaces:**
- Consumes: `ingredient.noodle` through the existing i18n lookup.
- Produces: the English raw-bin label `Noodle Sheet`.

- [ ] **Step 1: Add a focused dictionary assertion**

Assert that `en['ingredient.noodle']` is `Noodle Sheet` while the Chinese dictionary and all recipe/step identifiers remain unchanged.

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- --run src/i18n/core.test.ts`

Expected: FAIL with `Noodle Wrap` received.

- [ ] **Step 3: Update only the raw ingredient label**

Change:

```ts
'ingredient.noodle': 'Noodle Sheet',
```

- [ ] **Step 4: Run focused i18n tests**

Run: `npm test -- --run src/i18n/core.test.ts src/i18n/appLocale.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/i18n/en.ts src/i18n/core.test.ts
git commit -m "fix: clarify raw noodle ingredient label"
```

### Task 4: Four-page English Visual QA

**Files:**
- Create: `scripts/capture-title-plaque-neutralization.mjs`
- Generate: `docs/qa/screenshots/title-plaque-neutralization/*.png`
- Create: `docs/qa/title-plaque-neutralization.md`

**Interfaces:**
- Consumes: existing QA routes for Home, Settings, Day Select, and Summary.
- Produces: four English 1440×810 screenshots, a contact sheet, automated diagnostics, and manual text-off-overlay findings.

- [ ] **Step 1: Create a four-state capture script**

Use the existing Playwright/Sharp harness but define only Home, Settings, Day Select, and Summary at 1440×810. Preserve console-error, overflow, clipping, locale, CJK DOM/aria, and undersized-text checks.

- [ ] **Step 2: Run the capture**

Run: `node scripts/capture-title-plaque-neutralization.mjs`

Expected: four screenshots plus one contact sheet with zero automated failures.

- [ ] **Step 3: Manually review the text-off criterion**

Inspect each title region. Record PASS only when the neutral mask has no visible straight rectangular boundary and reads as texture inside the original plaque when English glyphs are mentally removed.

- [ ] **Step 4: Run final verification**

Run: `npm test -- --run`

Expected: all test files and tests pass.

Run: `npm run build`

Expected: TypeScript and Vite production build pass.

- [ ] **Step 5: Audit frozen paths**

Confirm the source diff contains only `src/landscape.css`, `src/styles/englishVisualPolish.test.ts`, `src/i18n/en.ts`, `src/i18n/core.test.ts`, and the QA script. Confirm no character, gameplay, campaign, progression, day-card, bubble, tutorial, summary-data, upgrade, or button source changed.

- [ ] **Step 6: Commit QA evidence**

```powershell
git add -f scripts/capture-title-plaque-neutralization.mjs docs/qa/title-plaque-neutralization.md docs/qa/screenshots/title-plaque-neutralization
git commit -m "test: add title plaque neutralization qa"
```
