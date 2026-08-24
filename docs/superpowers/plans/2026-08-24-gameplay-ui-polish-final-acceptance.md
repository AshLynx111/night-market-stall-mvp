# Gameplay UI Polish Final Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one current, reproducible production acceptance package that closes every test and screenshot requirement in the original gameplay UI/UX phase-one brief.

**Architecture:** A small source contract prevents the original forbidden emoji from returning, while the dormant legacy control reuses `GameIcon`. One Playwright script runs isolated production-preview scenarios plus two explicitly labeled development-fixture scenarios, records exact state checks, and writes all required desktop/mobile screenshots plus JSON evidence.

**Tech Stack:** React 19, TypeScript, Vitest, Vite production preview, Playwright with Microsoft Edge.

## Global Constraints

- Do not change gameplay rules, campaign progression, recipes, difficulty, order counts, income values, upgrades, or saved-data schema.
- Do not modify approved PNG masters or generated runtime WebP encoding.
- Keep all visible copy Chinese and retain existing accessibility labels.
- Capture desktop evidence at exactly 1440×810 and mobile landscape evidence at exactly 844×390.
- Do not claim a native Safari run because no local WebKit browser binary is installed.
- Preserve the untracked `output/` directory and do not merge or push the branch.

---

### Task 1: Close the remaining source-style conflict

**Files:**
- Create: `src/styles/forbiddenGameplayEmoji.test.ts`
- Modify: `src/components/TopBar.tsx`

**Interfaces:**
- Consumes: `GameIcon({ name: 'sound-on' | 'sound-off' })`.
- Preserves: `TopBarProps` and `onToggleSound` behavior.

- [ ] **Step 1: Write the failing production-source contract**

Scan non-test `.ts`, `.tsx`, and `.css` files under `src` and assert that none contain `😊`, `💵`, `☾`, `♪`, `Ⅱ`, `🔥`, or `🎵`.

- [ ] **Step 2: Verify the contract fails**

Run: `npm test -- --run src/styles/forbiddenGameplayEmoji.test.ts`

Expected: FAIL naming `src/components/TopBar.tsx` and the `♪` character.

- [ ] **Step 3: Replace the legacy character**

Import `GameIcon` in `TopBar.tsx` and render `<GameIcon name={soundEnabled ? 'sound-on' : 'sound-off'} />` inside the existing button.

- [ ] **Step 4: Verify the focused contract**

Run: `npm test -- --run src/styles/forbiddenGameplayEmoji.test.ts src/components/game/GameIcon.test.tsx src/components/game/GameplayHud.test.tsx`

Expected: all tests pass.

### Task 2: Add complete production acceptance QA

**Files:**
- Create: `scripts/capture-gameplay-ui-polish-final.mjs`
- Create: `docs/qa/screenshots/gameplay-ui-polish-final/*.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-final/qa-results.json`

**Interfaces:**
- Produces `flowChecks` for tutorial, delivery, both griddles, multiple customers, critical patience, pause, music, next day, persistence, mobile tap, image decoding, and console errors.
- Uses production campaign selection for Day 1, Day 3, and Day 5; only low patience and direct summary setup use existing development query fixtures.

- [ ] **Step 1: Implement isolated browser helpers**

Start `vite preview` on port 4186 and a fixture-only Vite development server on port 4187, open fresh contexts with deterministic storage, wait for decoded images, and collect console errors per scenario.

- [ ] **Step 2: Drive the full Day 1 flow**

Capture initial, first-customer, cooking, and delivery states. Toggle music off/on, open/close pause, and complete noodle, egg, hot dog, two sauce strokes, scallion, three cuts, roll, pack, and delivery through live controls.

- [ ] **Step 3: Verify composition states**

Seed valid settled saves and enter Day 3 and Day 5 through the production selection screen. On Day 3, wait for two active customers, place a noodle on the left and right slots, assert both stage markers, and capture separate customer and griddle screenshots. On Day 5, require the expanded rack overlay and capture it. Use the development server only for `qaPatienceRatio=0.12`, require a critical customer, and capture it.

- [ ] **Step 4: Verify progression and persistence**

On the development server, open the existing summary fixture with a settled Day 1 save, press `进入下一天`, require the Day 2 kitchen, and confirm the stored Day 1 stars and unlocked day remain valid.

- [ ] **Step 5: Verify mobile landscape**

At 844×390 with touch enabled, tap a noodle into a griddle, open the pause dialog, require the logical game surface and dialog to stay inside the viewport, close the dialog, and capture the playing state.

- [ ] **Step 6: Run and inspect acceptance evidence**

Run: `node scripts/capture-gameplay-ui-polish-final.mjs`

Expected: nine screenshots, every boolean check true, exactly one Day 1 delivery, all images decoded, and zero console errors.

### Task 3: Full regression and delivery report

**Files:**
- Create: `docs/qa/gameplay-ui-polish-final-report.md`

**Interfaces:**
- Summarizes all eleven final-output items requested in the original brief and links the current evidence.

- [ ] **Step 1: Run complete automated verification**

Run: `node scripts/build-runtime-webp-assets.mjs --check --json`

Expected: 407 fresh assets and at least 75% aggregate savings.

Run: `npm test -- --run`

Expected: all test files pass.

Run: `npm run build`

Expected: TypeScript and Vite production build pass with zero emitted PNG files.

- [ ] **Step 2: Visually inspect all nine screenshots**

Require correct framing, readable orders/patience, both occupied griddles in their named capture, expanded rack alignment, visible delivery feedback, and no transparent-edge artifacts.

- [ ] **Step 3: Write the final report**

Record changed files/components, removed emoji, feedback additions, test/build results, screenshot paths, observed gameplay bugs, remaining hand-drawn asset opportunities, and the recommended next product phase. Explicitly distinguish automated Safari-facing compatibility checks from a native Safari browser run.

- [ ] **Step 4: Commit and verify cleanliness**

Run: `git diff --check`, commit the final acceptance implementation/evidence, and require `git status --short` to show only the preserved untracked `output/` directory.
