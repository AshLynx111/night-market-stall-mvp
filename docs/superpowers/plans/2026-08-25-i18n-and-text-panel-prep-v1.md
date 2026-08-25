# I18n and Text Panel Preparation V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable `zh-CN` / `en` localization and reusable dynamic text-surface hooks without changing gameplay, campaign progression, characters, approved backgrounds, or page geometry.

**Architecture:** A dependency-free typed dictionary and React context resolve locale from `?lang=` and localStorage. Rendering components localize campaign entities by stable IDs, while English DOM overlays replace actionable text baked into approved plates. Existing dynamic text containers gain shared semantic classes and token-based light styling.

**Tech Stack:** React 19, TypeScript 7, Vitest 3, Vite 8, Playwright 1.62, Sharp 0.35, CSS.

## Global Constraints

- Supported locales are exactly `zh-CN` and `en`; default is `zh-CN`.
- English preview is `/?lang=en`; the valid query value persists to `night-market-locale-v1`.
- Do not modify `src/landscape/campaign.ts`, `src/landscape/progression.ts`, `src/landscape/dayRetention.ts`, or `src/landscape/kitchen/tutorial.ts`.
- Do not modify customer assets, `CustomerActor` geometry/styles, recipes, order generation, economy, scoring, upgrades, storage shape, or state machines.
- Do not regenerate or replace approved raster page backgrounds.
- Preserve existing page and gameplay geometry; only text wrapping, padding, and font-size adaptations are allowed.
- Freeze audit baseline is `daba68b`.

---

## File Structure

- Create `src/i18n/zh-CN.ts`: canonical flat Chinese message dictionary.
- Create `src/i18n/en.ts`: natural English dictionary satisfying all Chinese keys.
- Create `src/i18n/core.ts`: locale normalization, storage/query resolution, interpolation, and message types.
- Create `src/i18n/I18nProvider.tsx`: context, provider, hook, document locale attributes.
- Create `src/i18n/domain.ts`: day/recipe/ingredient/step/customer/retention translation helpers.
- Create `src/i18n/core.test.ts`, `src/i18n/domain.test.ts`: contract coverage.
- Modify `src/main.tsx`: mount the provider.
- Modify `src/components/LandscapeGame.tsx`: page, modal, upgrade, event, accessibility, and approved-plate English overlays.
- Modify reachable `src/components/game/*.tsx`: gameplay UI localization.
- Modify `src/landscape.css`, `src/styles/kitchen.css`: semantic text surfaces and English length/plate overlays.
- Modify `scripts/capture-full-visual-consistency-v1.mjs`: locale-aware URL and stable selectors.
- Create `scripts/create-i18n-text-panel-contact-sheets.mjs`: bilingual comparisons.
- Create `docs/qa/i18n-and-text-panel-prep-v1.md`: results and freeze report.

### Task 1: Typed i18n Core and Locale Bootstrap

**Files:**
- Create: `src/i18n/zh-CN.ts`
- Create: `src/i18n/en.ts`
- Create: `src/i18n/core.ts`
- Create: `src/i18n/I18nProvider.tsx`
- Create: `src/i18n/core.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `Locale = 'zh-CN' | 'en'`.
- Produces: `normalizeLocale(value: unknown): Locale | null`.
- Produces: `resolveInitialLocale(search: string, stored: string | null): Locale`.
- Produces: `translate(locale: Locale, key: TranslationKey, values?: TranslationValues): string`.
- Produces: `I18nProvider` and `useI18n(): { locale; t }`.

- [ ] **Step 1: Write failing core tests**

```ts
expect(normalizeLocale('en')).toBe('en')
expect(normalizeLocale('fr')).toBeNull()
expect(resolveInitialLocale('?lang=en', 'zh-CN')).toBe('en')
expect(resolveInitialLocale('', 'en')).toBe('en')
expect(resolveInitialLocale('', null)).toBe('zh-CN')
expect(Object.keys(en)).toEqual(Object.keys(zhCN))
expect(translate('en', 'hud.orders', { served: 2, target: 5 })).toBe('Orders 2/5')
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/i18n/core.test.ts`

Expected: FAIL because `src/i18n/core.ts` does not exist.

- [ ] **Step 3: Implement the core**

```ts
export const LOCALES = ['zh-CN', 'en'] as const
export type Locale = typeof LOCALES[number]
export type TranslationValues = Record<string, string | number>

export function normalizeLocale(value: unknown): Locale | null {
  return value === 'zh-CN' || value === 'en' ? value : null
}

export function resolveInitialLocale(search: string, stored: string | null): Locale {
  return normalizeLocale(new URLSearchParams(search).get('lang'))
    ?? normalizeLocale(stored)
    ?? 'zh-CN'
}
```

`translate()` selects the locale dictionary and replaces every `{token}` from the supplied values. Missing values leave the token visible so tests can detect incomplete calls.

- [ ] **Step 4: Mount the provider**

```tsx
<StrictMode>
  <I18nProvider>
    <App />
  </I18nProvider>
</StrictMode>
```

The provider reads storage defensively, persists valid URL locale values, and sets `html.lang` plus `html.dataset.locale`.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test -- --run src/i18n/core.test.ts && npm run build`

Expected: core tests PASS and production build PASS.

- [ ] **Step 6: Commit**

```text
feat: add unified i18n structure
```

### Task 2: Campaign-Domain Presentation Translation

**Files:**
- Create: `src/i18n/domain.ts`
- Create: `src/i18n/domain.test.ts`
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/i18n/en.ts`

**Interfaces:**
- Consumes: `TranslationKey`, `TFunction`, `RecipeId`, `IngredientId`, `StepId`, `DayRetentionCueModel`.
- Produces: `createDomainI18n(t)` with `dayText`, `recipeText`, `ingredientText`, `stepText`, `customerText`, `retentionText`.

- [ ] **Step 1: Write failing domain coverage tests**

```ts
for (const day of DAYS) {
  expect(enDomain.dayText(day.day, 'title')).not.toMatch(/[\u3400-\u9fff]/)
}
for (const id of Object.keys(RECIPES) as RecipeId[]) {
  expect(enDomain.recipeText(id, 'name')).not.toMatch(/[\u3400-\u9fff]/)
}
for (const id of availableIngredients(6)) {
  expect(enDomain.ingredientText(id)).not.toMatch(/[\u3400-\u9fff]/)
}
```

- [ ] **Step 2: Verify focused failure**

Run: `npm test -- --run src/i18n/domain.test.ts`

Expected: FAIL because domain helpers do not exist.

- [ ] **Step 3: Implement ID-based helpers**

```ts
const dayText = (day: number, field: DayField) => t(`day.${day}.${field}` as TranslationKey)
const recipeText = (id: RecipeId, field: RecipeField) => t(`recipe.${id}.${field}` as TranslationKey)
const ingredientText = (id: IngredientId) => t(`ingredient.${id}` as TranslationKey)
const stepText = (id: StepId, field: StepField) => t(`step.${id}.${field}` as TranslationKey)
```

`retentionText()` builds localized accessible text from `cue.day`, `cue.newIngredients`, and `cue.newRecipes`; it never returns the model's precomposed Chinese accessibility string in English.

- [ ] **Step 4: Run domain and campaign tests**

Run: `npm test -- --run src/i18n/domain.test.ts src/landscape/campaign.test.ts src/landscape/dayRetention.test.ts`

Expected: all tests PASS with campaign files unchanged.

- [ ] **Step 5: Commit**

```text
feat: add typed campaign presentation translations
```

### Task 3: Internationalize Page Shells and Approved Plates

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/landscape.css`

**Interfaces:**
- Consumes: `useI18n()` and domain helpers.
- Produces: localized home, settings, select, summary, event, menu/help/abandon modals, upgrades, rotate prompt, alt text, and ARIA labels.
- Produces: `data-locale-art-text` DOM overlays displayed only for `html[data-locale='en']`.

- [ ] **Step 1: Add failing English route tests**

Set `history.replaceState({}, '', '/?lang=en&qaScreen=select')`, render `App` under `I18nProvider`, and assert:

```ts
expect(container.textContent).toContain('Day Select')
expect(container.textContent).toContain('Unlock by completing the previous day')
expect(container.textContent).toContain('Upgrade Heat')
expect(container.textContent).not.toContain('完成前一天后解锁')
```

Add summary and settings fixtures asserting `Shift Complete`, `Orders`, `Satisfaction`, `Mistakes`, `Master Volume`, `Music`, and `SFX`.

- [ ] **Step 2: Verify English tests fail**

Run: `npm test -- --run src/App.test.tsx`

Expected: new English assertions FAIL while existing Chinese assertions still pass.

- [ ] **Step 3: Replace page hard-coded strings with keys**

At the top of `LandscapeGame`, call:

```ts
const { locale, t, domain } = useI18n()
```

Use translation keys for all visible text and accessibility labels. Add locale DOM overlays for baked actionable text, keeping original hotspot handlers and coordinates.

- [ ] **Step 4: Add maintainable English menu modal**

Chinese continues to render the approved `menuBoard` image. English renders a DOM menu using `RECIPES` and domain names with the existing modal frame and close behavior.

- [ ] **Step 5: Add locale overlay CSS**

```css
[data-locale-art-text] { display: none; }
html[data-locale="en"] [data-locale-art-text] { display: grid; }
html[data-locale="en"] .locale-art-text--paper { background: var(--paper-aged); }
html[data-locale="en"] .locale-art-text--wood { background: var(--wood-dark); color: var(--paper-cream); }
```

Use existing percentage coordinates and preserve every button's hit area.

- [ ] **Step 6: Run App, visual-token, and accessibility tests**

Run: `npm test -- --run src/App.test.tsx src/styles/referenceVisualTokens.test.ts src/components/game/AccessibleDialog.test.tsx`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```text
feat: internationalize menu and summary screens
```

### Task 4: Internationalize Reachable Gameplay Presentation

**Files:**
- Modify: `src/components/game/GameplayHud.tsx`
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/game/OrderBubble.tsx`
- Modify: `src/components/game/TutorialOverlay.tsx`
- Modify: `src/components/game/DeliveryFeedback.tsx`
- Modify: `src/components/game/CookingFeedback.tsx`
- Modify: `src/components/game/CookingGestureLayer.tsx`
- Modify: `src/components/game/GriddleSlot.tsx`
- Modify: `src/components/game/ServingTray.tsx`
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/components/game/DayRetentionCue.tsx`
- Modify: relevant component tests.

**Interfaces:**
- Consumes: `useI18n()` and domain helpers.
- Produces: English-visible HUD, ingredient labels, order names/modifiers, tutorial prompts, heat states, tray actions, feedback, and accessibility labels.

- [ ] **Step 1: Add failing English component tests**

Wrap each target with `<I18nProvider locale="en">` and assert representative output:

```ts
expect(hud).toContain('Day 1')
expect(hud).toContain('Orders 2/5')
expect(order).toContain('Extra Egg')
expect(tutorial).toContain('Tap the noodle sheet')
expect(delivery).toContain('Perfect')
```

- [ ] **Step 2: Verify focused failures**

Run the affected component test files directly and expect the English cases to fail.

- [ ] **Step 3: Localize component rendering only**

Use `tutorialStep(state)` as the translation key source rather than changing `tutorialInstruction()`. Use recipe/ingredient/step IDs rather than reading Chinese labels from campaign objects. Customer display names pass through `domain.customerText(name)`; no character data or art is changed.

- [ ] **Step 4: Run gameplay component and kitchen reducer tests**

Run: `npm test -- --run src/components/game src/landscape/kitchen/reducer.test.ts src/landscape/kitchen/tutorial.test.ts`

Expected: component and frozen logic tests PASS.

- [ ] **Step 5: Commit**

```text
feat: internationalize gameplay and menu text
```

### Task 5: Normalize Dynamic Text Surfaces and English Lengths

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/components/game/GameplayHud.tsx`
- Modify: `src/components/game/OrderBubble.tsx`
- Modify: `src/components/game/TutorialOverlay.tsx`
- Modify: `src/landscape.css`
- Modify: `src/styles/kitchen.css`
- Create: `src/styles/textSurfaceContract.test.ts`

**Interfaces:**
- Produces semantic classes `.ui-text-surface`, `.ui-text-surface--paper`, `.ui-text-surface--wood`, `.ui-text-chip`, and role hooks.
- Does not produce a new layout component or change business props.

- [ ] **Step 1: Add failing source/CSS contract tests**

Assert the common classes exist in CSS and appear on order bubble, tutorial hint, HUD orders, summary stat, select status, and settings locale labels.

- [ ] **Step 2: Verify contract failure**

Run: `npm test -- --run src/styles/textSurfaceContract.test.ts`

Expected: FAIL until semantic classes are applied.

- [ ] **Step 3: Add semantic classes and token styling**

```css
.ui-text-surface { border-color: color-mix(in srgb, var(--wood-mid) 72%, transparent); }
.ui-text-surface--paper { background: linear-gradient(145deg, var(--paper-cream), var(--paper-aged)); }
.ui-text-surface--wood { background: linear-gradient(145deg, var(--wood-mid), var(--wood-dark)); }
.ui-text-chip { box-shadow: inset 0 1px rgb(255 244 205 / .5); }
```

Existing role selectors retain their geometry. English selectors may reduce font size, permit two lines, and balance wrapping.

- [ ] **Step 4: Run layout and surface tests**

Run: `npm test -- --run src/styles/textSurfaceContract.test.ts src/styles/kitchen-layout.test.ts src/styles/visualSystemUnification.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```text
refactor: normalize text panel components
```

### Task 6: Bilingual Production Visual QA

**Files:**
- Modify: `scripts/capture-full-visual-consistency-v1.mjs`
- Create: `scripts/create-i18n-text-panel-contact-sheets.mjs`
- Create: `docs/qa/screenshots/i18n-and-text-panel-prep-v1/**`

**Interfaces:**
- Consumes: `VISUAL_QA_LOCALE` and `VISUAL_QA_OUTPUT`.
- Produces: per-locale screenshots, contact sheets, bilingual comparisons, and `qa-results.json`.

- [ ] **Step 1: Replace text-dependent QA locators**

Use stable selectors such as `.home-hotspot--start`, `.day-card--1`, `[data-tray-slot-id]`, `.settings-screen__return`, and data attributes. Append `lang` to the initial URL from `VISUAL_QA_LOCALE`.

- [ ] **Step 2: Build and capture Chinese**

Run:

```powershell
npm run build
$env:VISUAL_QA_LOCALE='zh-CN'
$env:VISUAL_QA_OUTPUT='i18n-and-text-panel-prep-v1/zh-CN'
node scripts/capture-full-visual-consistency-v1.mjs
```

Expected: screenshots complete with zero clipping, overflow, console errors, page errors, or decode failures.

- [ ] **Step 3: Capture English**

Run the same script with locale `en` and output `i18n-and-text-panel-prep-v1/en`.

- [ ] **Step 4: Generate bilingual comparisons**

The Sharp script places Chinese and English contact sheets side by side with labels and creates desktop/mobile comparison PNGs.

- [ ] **Step 5: Inspect and iterate**

View desktop, mobile, summary, select, settings, gameplay, and rotate prompt screenshots. Fix only clipping, overlap, untranslated dynamic text, or obvious panel regression; rerun both locale captures after any CSS/DOM change.

- [ ] **Step 6: Commit**

```text
test: add locale visual QA coverage
```

### Task 7: Final Regression, Freeze Audit, and Report

**Files:**
- Create: `docs/qa/i18n-and-text-panel-prep-v1.md`

**Interfaces:**
- Produces final test/build results, modified file list, preview instructions, text-surface inventory, P2 deferrals, and exact freeze confirmations.

- [ ] **Step 1: Run full verification**

Run:

```text
npm test -- --run
npm run validate:art
npm run build
```

Expected: all commands exit 0. There is no separate typecheck script; `npm run build` executes `tsc -b` before Vite.

- [ ] **Step 2: Audit frozen paths from `daba68b`**

Run `git diff --name-only daba68b..HEAD` against customer assets, `CustomerActor`, `src/landscape/campaign.ts`, `src/landscape/progression.ts`, `src/landscape/dayRetention.ts`, `src/landscape/kitchen`, reducers, and storage/economy files. Expected output is empty for all frozen groups.

- [ ] **Step 3: Write the report**

Include the 14 required report items, Chinese and English QA results, screenshot links, build/test counts, deferred visual polish, and exact lines:

```text
Character assets modified: NO
Gameplay logic modified: NO
Campaign/progression modified: NO
```

- [ ] **Step 4: Commit**

```text
docs: report bilingual text foundation qa
```
