# English Visual Polish V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all functional English copy into the existing 2.5D night-market wood and paper surfaces so the English locale reads as a native game UI without changing the accepted Chinese UI, characters, layout, or gameplay.

**Architecture:** Keep the current `data-locale-art-text` and reusable text-surface DOM, add one localized title surface for the home sign, and replace text-local solid masks with opaque full-face wood/paper treatments scoped under `html[data-locale="en"]`. Extend the existing Playwright/Sharp QA pattern with English priority pages, Chinese regression pages, contact sheets, and pasted-overlay risk evidence; add no locale raster asset unless visual QA proves CSS cannot hide a baked glyph edge.

**Tech Stack:** React 19, TypeScript 7, Vite 8, CSS, Vitest, Playwright 1.62, Sharp 0.35.

## Global Constraints

- Work only on `codex/english-visual-polish-v1`; do not merge `main`.
- Preserve the current `data-locale-art-text` strategy and scope visual overrides with `html[data-locale="en"]`.
- Do not modify character assets, character geometry, expressions, animation, or components.
- Do not modify recipes, customer generation, orders, scoring, tutorial state, saves, timing, day difficulty, progression, economy, or upgrade values.
- Do not modify approved source art or regenerate complete UI screens.
- Preserve home, settings, select, gameplay, and summary geometry and existing hit targets.
- Preserve the accepted money-bag, stove-fire, and sign upgrade icons.
- Use only two English font roles and no remote font dependency.
- Paper UI must use warm cream, warm-brown edges, soft yellow highlights, warm shadows, and subtle grain; pure white, cold gray, glass blur, and Material cards are prohibited.
- Final pasted-overlay risk for Home, Settings, Day Select, and Summary must be `LOW` or `NONE`.
- Final report must state `Character assets modified: NO`, `Gameplay logic modified: NO`, and `Campaign/progression modified: NO`.

## File Map

- `src/components/LandscapeGame.tsx`: render the localized home-title surface; keep all existing controls and callbacks.
- `src/i18n/en.ts`: provide the two English title lines.
- `src/i18n/zh-CN.ts`: provide key parity without changing visible Chinese presentation.
- `src/landscape.css`: own English font roles, wood/paper materials, priority-page integration, gameplay paper panels, and responsive English adjustments.
- `src/styles/englishVisualPolish.test.ts`: contract-test scope, structure, fonts, material rules, and frozen boundaries.
- `src/i18n/appLocale.test.tsx`: verify the localized title surface exists only in English and its accessible name remains the approved game name.
- `scripts/capture-english-visual-polish-v1.mjs`: produce desktop/mobile English QA, Chinese regression captures, diagnostics, contact sheets, and overlay-risk records.
- `docs/qa/screenshots/english-visual-polish-v1/`: generated screenshots, contact sheets, and JSON evidence.
- `docs/qa/english-visual-polish-v1.md`: final audit table, risk ratings, QA results, asset bytes, and frozen-boundary declarations.

---

### Task 1: Lock the English Visual Contract and Add the Home Title Surface

**Files:**
- Create: `src/styles/englishVisualPolish.test.ts`
- Modify: `src/components/LandscapeGame.tsx:515-528`
- Modify: `src/i18n/en.ts:3-8`
- Modify: `src/i18n/zh-CN.ts:3-8`
- Modify: `src/i18n/appLocale.test.tsx:35-50`

**Interfaces:**
- Consumes: `locale`, `t`, `data-locale-art-text`, the current home art plate, and the existing `home-hotspot` controls.
- Produces: i18n keys `home.titlePrimary` and `home.titleSecondary`, plus decorative `.home-screen__locale-title` markup rendered only when `locale === 'en'`.

- [ ] **Step 1: Add failing structural and style-contract tests**

Create `src/styles/englishVisualPolish.test.ts` with these exact assertions:

```ts
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const cssPath = path.join(process.cwd(), 'src', 'landscape.css')
const screenPath = path.join(process.cwd(), 'src', 'components', 'LandscapeGame.tsx')

describe('English visual polish contract', () => {
  it('defines two English type roles and locale-scoped material surfaces', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('--font-display-en:')
    expect(css).toContain('--font-ui-en:')
    expect(css).toMatch(/html\[data-locale="en"\] \.home-screen__locale-title/)
    expect(css).toMatch(/html\[data-locale="en"\] \.day-card__locale-copy/)
    expect(css).toMatch(/html\[data-locale="en"\] \.summary-screen__locale-heading/)
  })

  it('renders a decorative English title without replacing home controls', async () => {
    const source = await readFile(screenPath, 'utf8')
    expect(source).toContain('home-screen__locale-title')
    expect(source).toContain("t('home.titlePrimary')")
    expect(source).toContain("t('home.titleSecondary')")
    expect(source.match(/className="home-hotspot home-hotspot--/g)).toHaveLength(5)
  })

  it('does not use the old flat text-local masks', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).not.toMatch(/settings-screen__locale-copy strong[^}]*background:\s*#e6bd7d/s)
    expect(css).not.toMatch(/settings-screen__locale-label[^}]*background:\s*#efc579/s)
    expect(css).not.toMatch(/summary-stat__label[^}]*background:\s*#f0d5a1/s)
  })

  it('keeps English polish out of frozen character and game-model files', async () => {
    const source = await readFile(screenPath, 'utf8')
    expect(source).not.toContain('customerArt')
    expect(source).not.toContain('assets/approved')
  })
})
```

Extend the English home test in `src/i18n/appLocale.test.tsx`:

```tsx
expect(container.querySelector('.home-screen__locale-title')?.textContent)
  .toBe('Night MarketStreet Food Stall')
expect(container.querySelector('.home-screen__locale-title')?.getAttribute('aria-hidden')).toBe('true')
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```powershell
npm test -- --run src/styles/englishVisualPolish.test.ts src/i18n/appLocale.test.tsx
```

Expected: failures mention missing `--font-display-en`, `home-screen__locale-title`, and title translation keys.

- [ ] **Step 3: Add the localized title keys and decorative markup**

Add key-complete dictionary entries:

```ts
// en.ts
'home.titlePrimary': 'Night Market',
'home.titleSecondary': 'Street Food Stall',

// zh-CN.ts; key parity only because this surface does not render in Chinese
'home.titlePrimary': '夜市烤冷面',
'home.titleSecondary': '',
```

Inside `.home-screen__plate`, immediately after the home image, add:

```tsx
{locale === 'en' && (
  <div className="home-screen__locale-title ui-text-surface ui-text-surface--wood" data-locale-art-text aria-hidden="true">
    <strong>{t('home.titlePrimary')}</strong>
    <span>{t('home.titleSecondary')}</span>
  </div>
)}
```

Do not edit any `onClick`, day, save, audio, progression, or menu code.

- [ ] **Step 4: Run the focused tests**

Run the command from Step 2. Expected: the i18n title assertion passes; style assertions for the new CSS remain red until Task 2.

- [ ] **Step 5: Commit the structural contract**

```powershell
git add src/styles/englishVisualPolish.test.ts src/components/LandscapeGame.tsx src/i18n/en.ts src/i18n/zh-CN.ts src/i18n/appLocale.test.tsx
git commit -m "refactor: isolate locale-neutral art surfaces"
```

---

### Task 2: Integrate English Home and Settings Copy

**Files:**
- Modify: `src/landscape.css:925-982`
- Test: `src/styles/englishVisualPolish.test.ts`

**Interfaces:**
- Consumes: `.home-screen__locale-title`, `.home-hotspot__locale-label`, `.settings-screen__locale-copy`, `.settings-screen__locale-label`, `.settings-screen__return-label`.
- Produces: `--font-display-en`, `--font-ui-en`, `--paper-grain-en`, `--wood-grain-en`, and English-only full-face wood/paper surfaces.

- [ ] **Step 1: Define the two typography roles and reusable material layers**

At the start of the locale-ready surface section in `src/landscape.css`, add:

```css
:root {
  --font-display-en: "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  --font-ui-en: "Trebuchet MS", "Segoe UI", Arial, sans-serif;
  --paper-grain-en:
    radial-gradient(circle at 18% 24%, rgb(116 68 34 / .08) 0 1px, transparent 1.5px),
    radial-gradient(circle at 73% 62%, rgb(255 247 213 / .24) 0 1px, transparent 1.7px),
    linear-gradient(145deg, #f6e3ba, #dfbd83);
  --wood-grain-en:
    repeating-linear-gradient(7deg, transparent 0 7px, rgb(255 203 116 / .045) 8px, transparent 10px),
    radial-gradient(ellipse at 24% 12%, #b86432, transparent 48%),
    linear-gradient(160deg, #9c4d27, #663018 72%, #4d2413);
}
```

- [ ] **Step 2: Replace the home title and button-face rules**

Implement the title as an opaque inner sign surface and reuse the same wood material on complete button faces:

```css
html[data-locale="en"] .home-screen__locale-title {
  position: absolute; z-index: 2; left: 31.1%; top: 5.8%; width: 37.8%; height: 16.7%;
  display: grid; place-content: center; gap: 3%; padding: 1.2% 4%; overflow: hidden;
  border: 2px solid #6e3219; border-radius: 28% 23% 24% 25% / 24% 27% 23% 25%;
  background: var(--wood-grain-en); box-shadow: inset 0 3px #d78a45, inset 0 -8px rgb(48 20 10 / .38), 0 4px 8px rgb(31 13 8 / .3);
  color: #ffe4a3; text-align: center; text-shadow: 0 2px #3d1b10; pointer-events: none;
}
html[data-locale="en"] .home-screen__locale-title strong { font: 900 clamp(21px, 3vw, 50px)/.92 var(--font-display-en); }
html[data-locale="en"] .home-screen__locale-title span { font: 800 clamp(9px, 1.15vw, 19px)/1 var(--font-ui-en); letter-spacing: .12em; text-transform: uppercase; }
html[data-locale="en"] .home-hotspot__locale-label {
  inset: 2%; border: 2px solid #77391e; background: var(--wood-grain-en);
  box-shadow: inset 0 2px rgb(255 211 130 / .58), inset 0 -6px rgb(66 26 14 / .35), 0 4px 5px rgb(28 12 8 / .4);
  font-family: var(--font-display-en);
}
```

Retain all existing hotspot coordinates. Keep hover/focus/active selectors on `.home-hotspot`; add only material-consistent brightness and `translateY(2px)` on the inner face.

- [ ] **Step 3: Replace settings text-local fills with paper/wood labels**

Use `var(--paper-grain-en)` for the title and row labels, with full label bounds, `1px solid #8a5a31`, warm inset highlight, and a short `0 2px 4px rgb(61 29 15 / .24)` shadow. Use `var(--font-display-en)` only for the title and `var(--font-ui-en)` for Master Volume, Music, SFX, and Back. Keep the slider selectors and their `left`, `top`, `width`, and `height` unchanged.

- [ ] **Step 4: Run style, app, and interaction tests**

```powershell
npm test -- --run src/styles/englishVisualPolish.test.ts src/styles/visualSystemUnification.test.ts src/i18n/appLocale.test.tsx src/App.test.tsx
```

Expected: all selected tests pass; the app test still reports five home hotspots and three settings sliders.

- [ ] **Step 5: Commit Home and Settings integration**

```powershell
git add src/landscape.css src/styles/englishVisualPolish.test.ts
git commit -m "style: integrate english home and settings copy"
```

---

### Task 3: Polish English Day Select Surfaces

**Files:**
- Modify: `src/landscape.css:975-995`
- Modify only when line count fails QA: `src/i18n/en.ts:34-49,208-235`
- Test: `src/styles/englishVisualPolish.test.ts`
- Test: `src/i18n/appLocale.test.tsx`

**Interfaces:**
- Consumes: `.select-screen__locale-title`, `.select-hotspot__locale-label`, `.day-card__locale-copy`, `.day-card__stars`, `.day-hotspot__status`, and existing upgrade-shop markup.
- Produces: an inset textured paper face for each day card and material-matched select controls without changing the six-card grid.

- [ ] **Step 1: Extend the style contract for hierarchy and readable size**

Add assertions that the day-card selector uses `var(--paper-grain-en)`, the title uses `var(--font-display-en)`, body and goal use `var(--font-ui-en)`, and the minimum clamp values are at least `10px` for the reference desktop styles.

- [ ] **Step 2: Run the focused contract and verify it fails**

```powershell
npm test -- --run src/styles/englishVisualPolish.test.ts src/i18n/appLocale.test.tsx
```

Expected: failure reports the old Georgia/system stacks and 6px day-card minimums.

- [ ] **Step 3: Implement the day-card visual hierarchy**

Keep `inset: 5%`, the card frame, and star/status z-index. Apply the full inset paper texture and these hierarchy rules:

```css
html[data-locale="en"] .day-card__locale-copy {
  gap: 3%; padding: 6.5% 7.5%; border: 1px solid #a87442;
  background: var(--paper-grain-en); box-shadow: inset 0 2px rgb(255 247 213 / .7), inset 0 -9px rgb(102 57 28 / .1), 0 2px 4px rgb(45 25 14 / .16);
  font-family: var(--font-ui-en);
}
html[data-locale="en"] .day-card__locale-copy small { font: 900 clamp(10px, .65vw, 11px)/1 var(--font-ui-en); }
html[data-locale="en"] .day-card__locale-copy b { max-width: 74%; font: 900 clamp(12px, 1.23vw, 20px)/1 var(--font-display-en); }
html[data-locale="en"] .day-card__locale-copy span { font: 700 clamp(10px, .62vw, 11px)/1.18 var(--font-ui-en); }
html[data-locale="en"] .day-card__locale-copy em { font: 800 clamp(10px, .59vw, 10px)/1.12 var(--font-ui-en); }
```

Use the wood material for the header sign inner face and complete back button face; use a warm paper/menu-board treatment for Full Menu. Apply the shared wood texture to English upgrade-copy wells without changing icons or card geometry.

- [ ] **Step 4: Shorten only copy that exceeds the visual limits**

Measure each `.day-card__locale-copy` in Playwright at 1440×810 and 844×390. Keep existing strings when all text fits at 10px or larger and no region exceeds three lines. The approved compact replacements are:

```ts
'select.subtitle': 'Clear each day to unlock the next challenge.',
'day.2.story': 'Double-stack orders are pouring in.',
'day.5.story': 'New toppings arrive—and so does a celebrity traveler.',
'day.6.story': 'One travel post has everyone ordering the celebrity special.',
```

Apply only the replacements whose measured card fails the limit.

- [ ] **Step 5: Run focused tests and commit**

```powershell
npm test -- --run src/styles/englishVisualPolish.test.ts src/i18n/core.test.ts src/i18n/domain.test.ts src/i18n/appLocale.test.tsx
git add src/landscape.css src/i18n/en.ts src/styles/englishVisualPolish.test.ts
git commit -m "style: polish english day select surfaces"
```

Expected: tests pass, all dictionary keys remain complete, and no campaign model file is staged.

---

### Task 4: Unify Gameplay Paper Panels and English Summary Surfaces

**Files:**
- Modify: `src/landscape.css:421-425,540-605,925-1040`
- Test: `src/styles/englishVisualPolish.test.ts`
- Test: `src/components/game/OrderBubble.test.tsx`
- Test: `src/components/game/TutorialOverlay.test.tsx`
- Test: `src/components/game/GameplayHud.test.tsx`
- Test: `src/components/game/UpgradeCardIcon.test.tsx`

**Interfaces:**
- Consumes: `.hint-panel`, `.order-bubble-panel`, `.ui-text-surface--paper`, `.stat-card`, `.summary-screen__locale-heading`, `.summary-title`, `.summary-message`, `.summary-stat__label`, `.summary-actions`, and the approved upgrade icon components.
- Produces: one lightweight gameplay paper-note material and English-only summary paper/wood faces with frozen layout.

- [ ] **Step 1: Extend contracts for gameplay paper and summary material**

Assert that `.hint-panel` and `.order-bubble-panel` use warm non-white layered backgrounds, that the summary heading uses `var(--wood-grain-en)`, and that summary labels/actions use the shared font roles. Retain the existing upgrade icon test unchanged to detect redraws.

- [ ] **Step 2: Run the focused tests and verify the new style assertions fail**

```powershell
npm test -- --run src/styles/englishVisualPolish.test.ts src/components/game/OrderBubble.test.tsx src/components/game/TutorialOverlay.test.tsx src/components/game/GameplayHud.test.tsx src/components/game/UpgradeCardIcon.test.tsx
```

- [ ] **Step 3: Apply the lightweight Paper UI System to gameplay DOM**

Set `.hint-panel` to a warm cream layered background, `1px` warm edge, soft top-left highlight, and a short shadow. Set `.order-bubble-panel` to the same color family with stronger contrast, a thinner edge, and no heavy 3D transform. Do not modify `left`, `top`, dimensions, queue geometry, pointer handling, or gameplay timing.

- [ ] **Step 4: Replace summary text-local masks with complete inner surfaces**

Use `var(--wood-grain-en)` on `.summary-screen__locale-heading`; use `var(--paper-grain-en)` across `.summary-title`, `.summary-message`, stat-card inner faces, and stat labels; use the wood/paper face treatments on both action-button spans. Keep all position, width, height, and upgrade icon selectors unchanged. Set display typography on the heading/title and UI typography on stats, messages, actions, and upgrade copy.

- [ ] **Step 5: Normalize localized menu and event paper**

Reuse `var(--paper-grain-en)` on `.menu-modal__localized` and its recipe articles, and ensure `.dialogue-box` uses the shared warm paper tokens. Do not edit menu recipes, event sequence, character markup, or imagery.

- [ ] **Step 6: Run component and visual contracts, then commit**

```powershell
npm test -- --run src/styles/englishVisualPolish.test.ts src/styles/visualSystemUnification.test.ts src/components/game/OrderBubble.test.tsx src/components/game/TutorialOverlay.test.tsx src/components/game/GameplayHud.test.tsx src/components/game/UpgradeCardIcon.test.tsx src/App.test.tsx
git add src/landscape.css src/styles/englishVisualPolish.test.ts
git commit -m "style: unify english gameplay and summary surfaces"
```

Expected: all tests pass and the staged diff contains no image, campaign, progression, reducer, or customer file.

---

### Task 5: Add English Visual Integration QA

**Files:**
- Create: `scripts/capture-english-visual-polish-v1.mjs`
- Create: `docs/qa/english-visual-polish-v1.md`
- Generate: `docs/qa/screenshots/english-visual-polish-v1/*.png`
- Generate: `docs/qa/screenshots/english-visual-polish-v1/qa-results.json`

**Interfaces:**
- Consumes: Vite preview routes, `?lang=`, `?qaScreen=`, `?playDay=`, existing role labels, Playwright, and Sharp.
- Produces: 14 English screenshots, at least 8 Chinese regression screenshots, four contact sheets, diagnostics, and four pasted-overlay risk records.

- [ ] **Step 1: Copy the existing capture harness into the new QA script and define the exact states**

Use these state arrays:

```js
const englishStates = [
  { id: '01-home', name: 'Home', query: '' },
  { id: '02-settings', name: 'Settings', query: '', action: 'settings' },
  { id: '03-select', name: 'Day Select', query: 'qaScreen=select' },
  { id: '04-day1', name: 'Day 1', query: 'playDay=1', tutorialComplete: true },
  { id: '05-tutorial', name: 'Tutorial', query: 'playDay=1' },
  { id: '06-multiple-customers', name: 'Multiple Customers', query: 'playDay=2', tutorialComplete: true },
  { id: '07-summary', name: 'Summary', query: 'playDay=1&qaScreen=summary' },
]
const chineseStates = englishStates.filter(({ id }) => ['01-home', '03-select', '04-day1', '07-summary'].includes(id))
const viewports = [
  { id: '1440x810', width: 1440, height: 810 },
  { id: '844x390', width: 844, height: 390 },
]
```

Write output under `docs/qa/screenshots/english-visual-polish-v1` and keep the existing browser-error, overflow, clipping, locale, CJK DOM, and CJK attribute checks.

- [ ] **Step 2: Add geometry and typography diagnostics**

For each visible `[data-locale-art-text], .hint-panel, .order-bubble-panel, .stat-card`, record bounding box, computed font size, line height, background image, border color, and shadow. Assert every English functional text surface is at least `10px`, remains inside the viewport, and has neither `rgb(255, 255, 255)` as its sole background nor `none` as both border and shadow.

- [ ] **Step 3: Run the QA capture**

```powershell
node scripts/capture-english-visual-polish-v1.mjs
```

Expected: 22 screenshots, four contact sheets, zero browser errors, zero overflow, zero clipped controls, zero English CJK DOM/attribute findings, and zero text surfaces below 10px.

- [ ] **Step 4: Inspect all four contact sheets at original detail**

Inspect:

```text
contact-sheet-en-1440x810.png
contact-sheet-en-844x390.png
contact-sheet-zh-CN-1440x810.png
contact-sheet-zh-CN-844x390.png
```

For Home, Settings, Day Select, and Summary, record one of `NONE`, `LOW`, `MEDIUM`, or `HIGH`. Adjust only English-scoped CSS and rerun the capture until every page is `LOW` or `NONE`, no Chinese glyph edge is visible beneath functional copy, and Chinese framing/geometry matches the baseline.

- [ ] **Step 5: Write the QA report with final evidence**

Create `docs/qa/english-visual-polish-v1.md` with the baked-text audit table from the design spec, changed-region outcome, four risk ratings with evidence, English desktop/mobile status, Chinese regression status, build/test commands, locale asset byte count, and these exact lines:

```text
Character assets modified: NO
Gameplay logic modified: NO
Campaign/progression modified: NO
```

- [ ] **Step 6: Commit QA coverage and evidence**

```powershell
git add scripts/capture-english-visual-polish-v1.mjs
git add -f docs/qa/english-visual-polish-v1.md docs/qa/screenshots/english-visual-polish-v1
git commit -m "test: add english visual integration qa"
```

---

### Task 6: Full Verification and Frozen-Boundary Audit

**Files:**
- Modify only when verification exposes a defect: files already listed in Tasks 1-5

**Interfaces:**
- Consumes: the completed implementation and QA evidence.
- Produces: a clean, independently committed branch ready for user review without merging `main`.

- [ ] **Step 1: Run the full automated suite**

```powershell
npm test
npm run build
```

Expected: all Vitest files pass and Vite produces `dist/` successfully.

- [ ] **Step 2: Audit prohibited paths and assets**

```powershell
$base = 'e70f494'
git diff --name-only "$base..HEAD"
git diff --name-only "$base..HEAD" | Select-String -Pattern 'customer|characters|campaign|progression|reducer|queue|service|assets/approved|UpgradeCardIcon'
```

Expected: the first command lists only planned source, CSS, test, script, and QA evidence files; the second command returns no matches. `output/` remains untracked and unstaged.

- [ ] **Step 3: Measure locale-specific assets**

```powershell
$localeAssets = Get-ChildItem 'src/assets/runtime/locale/en' -Recurse -File -ErrorAction SilentlyContinue
($localeAssets | Measure-Object Length -Sum).Sum
```

Expected for the CSS-first implementation: no files and an aggregate addition of `0` bytes. If the directory exists, list every file and record the exact aggregate bytes in the QA report.

- [ ] **Step 4: Verify commits and branch state**

```powershell
git status --short --branch
git log --oneline e70f494..HEAD
```

Expected: the branch is `codex/english-visual-polish-v1`, implementation commits are separate, no merge commit exists, and only the pre-existing `output/` is untracked.

- [ ] **Step 5: Apply a verification-only fix when required and commit it separately**

When Steps 1-4 expose a failure, edit only the already planned file responsible for that failure, rerun the failed command plus `npm test` and `npm run build`, then commit:

```powershell
git add src/landscape.css src/components/LandscapeGame.tsx src/i18n/en.ts src/i18n/zh-CN.ts src/styles/englishVisualPolish.test.ts src/i18n/appLocale.test.tsx scripts/capture-english-visual-polish-v1.mjs
git add -f docs/qa/english-visual-polish-v1.md docs/qa/screenshots/english-visual-polish-v1
git commit -m "fix: close english visual polish qa gaps"
```

Do not create this commit when verification passes without changes.
