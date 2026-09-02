# Poki Mobile Final Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Poki default to English, contain English Summary upgrade copy at 640x360 and 836x470, and stop touch-mobile browser chrome animation from continuously rescaling gameplay while preserving true resize behavior.

**Architecture:** Locale resolution becomes platform-aware at the pure resolver boundary. Gameplay sizing uses stable touch viewport CSS and container-driven `ResizeObserver` updates, with only a settled window/orientation fallback; HUD buttons use touch pointer-up activation with timestamp-bounded compatibility-click suppression while preserving native mouse and keyboard clicks. Existing Poki production QA gains focused mobile interaction, containment, resize, and screenshot evidence.

**Tech Stack:** React 19, TypeScript, Vitest/jsdom, CSS media queries, Vite Poki mode, Playwright with mocked Poki SDK.

## Global Constraints

- Work only on `codex/poki-platform-build-v1`; do not merge `main`.
- Deliver the complete change, plan/spec, QA report, and four screenshots as one final commit.
- Do not modify characters, gameplay, values, HUD design, advertising lifecycle, SDK integration, campaign, save behavior, or desktop 1440x810 presentation.
- Preserve the existing untracked `output/` directory.
- Poki without `lang` must ignore an old stored Chinese locale and resolve to `en`.
- Standalone without `lang` remains `zh-CN` when no stored locale exists.
- Explicit `?lang=en` and `?lang=zh-CN` remain QA overrides.
- Do not hard-code device dimensions into production viewport logic.

---

### Task 1: Platform-aware locale default

**Files:**
- Modify: `src/i18n/core.test.ts`
- Modify: `src/i18n/core.ts`
- Modify: `src/i18n/I18nProvider.tsx`

**Interfaces:**
- Consumes: `IS_POKI_BUILD: boolean` from `src/platform/build.ts`.
- Produces: `resolveInitialLocale(search, stored, platform)` where platform is `'standalone' | 'poki'`.

- [ ] **Step 1: Write the four required resolver cases**

Replace the default-resolution test with explicit assertions:

```ts
expect(resolveInitialLocale('', null, 'standalone')).toBe('zh-CN')
expect(resolveInitialLocale('', 'zh-CN', 'poki')).toBe('en')
expect(resolveInitialLocale('?lang=zh-CN', 'en', 'poki')).toBe('zh-CN')
expect(resolveInitialLocale('?lang=en', 'zh-CN', 'poki')).toBe('en')
```

- [ ] **Step 2: Run the focused test and verify the Poki default fails**

```powershell
npx vitest run --config vitest.config.ts src/i18n/core.test.ts --maxWorkers=1
```

Expected before implementation: the new third argument is rejected or Poki with stored Chinese resolves to `zh-CN`.

- [ ] **Step 3: Implement the platform-aware resolver**

```ts
export type LocalePlatform = 'standalone' | 'poki'

export function resolveInitialLocale(
  search: string,
  stored: string | null,
  platform: LocalePlatform = 'standalone',
): Locale {
  const queryLocale = localeFromSearch(search)
  if (queryLocale) return queryLocale
  if (platform === 'poki') return 'en'
  return normalizeLocale(stored) ?? 'zh-CN'
}
```

Pass `IS_POKI_BUILD ? 'poki' : 'standalone'` from `I18nProvider`.

- [ ] **Step 4: Run the focused test and confirm all locale cases pass**

Run the focused command from Step 2. Expected: PASS.

---

### Task 2: Single activation per HUD input

**Files:**
- Modify: `src/components/game/GameplayHud.test.tsx`
- Modify: `src/components/game/GameplayHud.tsx`

**Interfaces:**
- Consumes: native HTML button click semantics.
- Produces: one callback per touch pointer-up plus compatibility click, mouse click, Enter, or Space activation.

- [ ] **Step 1: Replace timer-suppression coverage with activation matrix coverage**

Render the HUD and assert separately that touch pointer-up followed by its compatibility click invokes once, while mouse and keyboard-generated clicks each invoke once:

```ts
pause.dispatchEvent(touchPointerUp)
pause.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
pause.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
pause.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
pause.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }))
pause.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
```

The touch sequence calls once, the standalone mouse click calls once, and Enter/Space zero-detail clicks each call once.

- [ ] **Step 2: Replace timer suppression with target/timestamp suppression**

Keep touch pointer-up responsiveness, record `{ target, timeStamp }`, and suppress only a same-target nonzero-detail click within 800ms:

```ts
const compatibilityClick = event.detail > 0
  && lastTouch?.target === event.currentTarget
  && event.timeStamp - lastTouch.timeStamp >= 0
  && event.timeStamp - lastTouch.timeStamp <= 800
```

Do not use a timeout. Mouse and keyboard clicks continue to call the action. Do not change classes, labels, icons, ARIA attributes, or shortcuts.

- [ ] **Step 3: Run focused HUD tests**

```powershell
npx vitest run --config vitest.config.ts src/components/game/GameplayHud.test.tsx --maxWorkers=1
```

Expected: markup, touch-derived click, mouse click, Enter, and Space tests pass with exactly one callback each.

---

### Task 3: Stable touch gameplay viewport

**Files:**
- Create: `src/landscape/useGameplayViewport.test.tsx`
- Modify: `src/landscape/useGameplayViewport.ts`
- Modify: `src/landscape.css`

**Interfaces:**
- Consumes: actual `.game-screen__safe-viewport` bounds through `ResizeObserver`.
- Produces: `sceneScale` that ignores visual-viewport-only bursts and updates on real container resize.

- [ ] **Step 1: Add hook regression tests**

Create a harness that renders the hook scale, mocks `getBoundingClientRect`, captures the `ResizeObserver` callback, and installs an `EventTarget` as `window.visualViewport`. Cover:

```ts
expect(scaleAfterVisualViewportBurst).toBe(initialScale)
expect(scaleAfterResizeObserverWithNewBounds).toBe(fitGameplayScene(836, 470))
```

Use fake timers to prove multiple `window.resize` events cause only one settled read, while a direct observer callback applies a real resize immediately.

- [ ] **Step 2: Run the hook test and verify failure**

```powershell
npx vitest run --config vitest.config.ts src/landscape/useGameplayViewport.test.tsx --maxWorkers=1
```

Expected before implementation: visual viewport bursts call the current immediate update path.

- [ ] **Step 3: Make container observation primary**

Keep `ResizeObserver(updateScale)`. Remove the `visualViewport.resize` subscription. Add a single timeout-backed `scheduleSettledScaleUpdate` for `window.resize` and `orientationchange`, clear/restart it on each event, and clear it during cleanup. Export the settle duration for deterministic tests.

- [ ] **Step 4: Add stable touch viewport CSS**

Add a supported touch-only rule without changing desktop:

```css
@media (hover: none) and (pointer: coarse) {
  .game-screen { height: 100svh; }
}
```

The safe viewport remains inset-based and the 1440x810 logical scene geometry remains unchanged.

- [ ] **Step 5: Run focused viewport and HUD tests**

Run both focused test files. Expected: PASS.

---

### Task 4: Small-landscape English Summary containment

**Files:**
- Modify: `src/landscape.css`

**Interfaces:**
- Consumes: existing Summary funds and upgrade-card DOM.
- Produces: contained English funds, title, benefit, and price copy at 640x360 and 836x470.

- [ ] **Step 1: Add a narrowly scoped media override**

Inside an English, landscape, maximum-height rule, keep card geometry fixed and override only internal copy:

```css
html[data-locale="en"] .summary-screen .upgrade-shop__funds {
  flex-direction: row;
  gap: .35em;
  white-space: nowrap;
  font-size: clamp(7px, 1.45vh, 9px);
  line-height: 1;
}
html[data-locale="en"] .summary-screen .upgrade-shop__funds b {
  font-size: clamp(9px, 2.2vh, 13px);
}
html[data-locale="en"] .summary-screen .upgrade-shop__copy {
  gap: 1px;
  padding: 1px 2px;
  line-height: 1;
}
html[data-locale="en"] .summary-screen .upgrade-shop__copy b {
  font-size: clamp(7px, 1.75vh, 10px);
  line-height: 1.05;
}
html[data-locale="en"] .summary-screen .upgrade-shop__copy small {
  font-size: clamp(6px, 1.35vh, 8px);
  line-height: 1.05;
}
```

Tune only these values from measured screenshots. Do not alter Summary positions, widths, heights, or whole-page scale.

- [ ] **Step 2: Confirm desktop rules remain outside the media query**

Use a 1440x810 screenshot comparison and computed-style check to ensure the new mobile rule does not match desktop height.

---

### Task 5: Poki production mobile QA and committed evidence

**Files:**
- Modify: `scripts/qa-poki-platform-build-v1.mjs`
- Create: `docs/qa/screenshots/poki-mobile-final-fix/gameplay-640x360.png`
- Create: `docs/qa/screenshots/poki-mobile-final-fix/summary-640x360.png`
- Create: `docs/qa/screenshots/poki-mobile-final-fix/gameplay-836x470.png`
- Create: `docs/qa/screenshots/poki-mobile-final-fix/summary-836x470.png`
- Create: `docs/qa/screenshots/poki-mobile-final-fix/qa-results.json`

**Interfaces:**
- Consumes: `dist-poki`, mocked Poki SDK, English locale, touch-enabled Playwright contexts.
- Produces: reproducible interaction/containment results and four reviewable screenshots.

- [ ] **Step 1: Add parameterless Poki locale assertions**

Open the Poki root with an old `night-market-locale-v1=zh-CN` value and no `lang`; require `html.lang` and `data-locale` to be `en`. Also retain explicit `lang=zh-CN` and `lang=en` checks.

- [ ] **Step 2: Add mobile gameplay interaction checks**

For 640x360 and 836x470 touch contexts, start in English, capture gameplay, then run Sound x5, Pause/Resume x3, and Home/cancel x2. Record callback-visible state transitions and SDK lifecycle edges; require one change per tap and no adjacent duplicate platform events.

- [ ] **Step 3: Add scale-stability and real-resize checks**

Record `--scene-scale` and logical-scene bounds through a burst of visual viewport/window resize-like events without changing the container. Require no continuous scale series. Then change the viewport to a genuinely different landscape size and require one settled fit update.

- [ ] **Step 4: Add Summary fixture containment checks**

Navigate to `?playDay=1&qaScreen=summary` in English with a save containing `coins: 60`, `fireLevel: 0`, and `signLevel: 0`. Require exact text `Cash`, `¥60`, `Upgrade Heat Lv.1`, and `Upgrade Sign Lv.1`. Check every funds/copy child rectangle stays within its card rectangle with a one-pixel tolerance and reject horizontal document scrolling.

- [ ] **Step 5: Write screenshots and QA results**

Write the four required PNG files and `qa-results.json` to the dedicated directory. Keep existing Poki lifecycle, ad freeze, storage failure, portrait, and build checks intact.

---

### Task 6: Final validation, one-commit delivery, and push

**Files:**
- All files listed above.

**Interfaces:**
- Consumes: completed implementation and QA artifacts.
- Produces: one pushed commit on `codex/poki-platform-build-v1`.

- [ ] **Step 1: Run required validation**

```powershell
npm test
npm run build
npm run build:poki
npm run test:poki
```

Expected: every command exits zero; Poki QA reports English defaults, contained Summary copy, stable toolbar-burst scale, real-resize response, and single HUD activations.

- [ ] **Step 2: Inspect all four screenshots**

Visually inspect the PNGs at original resolution. Confirm no text clipping, card overflow, horizontal scroll, scale pumping evidence, or desktop-style regression.

- [ ] **Step 3: Audit frozen scope and whitespace**

```powershell
git diff --check origin/codex/poki-platform-build-v1
git status --short
git diff --stat origin/codex/poki-platform-build-v1
```

Confirm no character, gameplay, value, ad lifecycle, SDK integration, campaign, save, or desktop geometry files changed beyond the approved viewport/HUD/i18n/CSS/QA scope.

- [ ] **Step 4: Collapse local planning history and create one final commit**

```powershell
git reset --soft origin/codex/poki-platform-build-v1
git commit -m "fix: finalize poki mobile experience"
```

This reset is intentionally soft: it preserves every approved file and creates the requested single commit without touching `output/`.

- [ ] **Step 5: Push and verify the branch**

```powershell
git push origin codex/poki-platform-build-v1
git ls-remote --heads origin refs/heads/codex/poki-platform-build-v1
```

Expected: the remote branch points to the one final commit; `main` remains unmerged.
