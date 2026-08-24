# Day 1 to Day N Retention Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn existing daily unlock data into a visible completion-to-next-day loop without adding persistence, currencies, missions, or blocking screens.

**Architecture:** A pure `dayRetention.ts` module derives each day's new ingredients, recipes, special beat, compact hook, and accessible description from `campaign.ts`. `DayRetentionCue` renders the summary strip; `LandscapeGame` selects current and next cues while preserving all existing callbacks and save behavior.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Vite, Playwright.

## Global Constraints

- Add no login reward, daily task, streak, energy, chest, currency, timer, notification, or save field.
- Do not change day count, recipes, ingredient unlock days, targets, patience, income, stars, upgrades, or campaign progression.
- Keep the summary cue non-interactive and non-blocking.
- Preserve the existing hand-drawn parchment layout, Chinese copy, accessibility, and mobile scaling.
- Preserve the untracked `output/`; do not merge or push.

---

### Task 1: Pure retention derivation

**Files:**
- Create: `src/landscape/dayRetention.ts`
- Create: `src/landscape/dayRetention.test.ts`
- Modify: `src/landscape/campaign.ts`

**Interfaces:**
- Produces `ingredientLabel(id: IngredientId): string` from `campaign.ts`.
- Produces `DayRetentionCueModel` with `day`, `title`, `story`, `goal`, `newIngredients`, `newRecipes`, `specialBeat`, `shortHook`, and `accessibleDescription`.
- Produces `retentionCueForDay(day: number): DayRetentionCueModel` and `nextRetentionCue(day: number): DayRetentionCueModel | null`.

- [ ] **Step 1: Write failing derivation tests**

Assert Day 1 derives the classic recipe, Day 2 derives cilantro/onion/chili plus big-eater, Day 5 derives tenderloin/enoki plus the special guest, Day 6 derives the celebrity-copycat beat, and the next cue after Day 6 is `null`.

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run src/landscape/dayRetention.test.ts`

Expected: FAIL because `dayRetention.ts` does not exist.

- [ ] **Step 3: Implement the pure model**

Compare `availableIngredients(day)` and `DAYS[day - 1].recipes` with the previous day. Prefer the Day 5/6 special beat for `shortHook`, otherwise use the first new recipe's `shortName + 解锁`, then new ingredient labels. Throw `Unknown campaign day: N` for invalid input.

- [ ] **Step 4: Verify the focused model**

Run: `npm test -- --run src/landscape/dayRetention.test.ts src/landscape/campaign.test.ts`

Expected: all tests pass and no campaign constant changes.

### Task 2: Summary preview and current-day marker

**Files:**
- Create: `src/components/game/DayRetentionCue.tsx`
- Create: `src/components/game/DayRetentionCue.test.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape.css`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes `DayRetentionCueModel | null`.
- Renders `[data-day-retention-cue]` with a full `aria-label` and either tomorrow's title/hook or terminal replay copy.
- Adds `[data-current-day-hook]` only to the highest playable unsettled day, or Day 6 after full completion.

- [ ] **Step 1: Write failing component and screen tests**

Require a Day 2 summary cue with `明日 · 香味出圈` when settling Day 2, the visible next action `明天 · 香味出圈`, a blank save Day 1 hook, a settled Day 1–2 Day 3 hook, and terminal Day 6 completion copy.

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run src/components/game/DayRetentionCue.test.tsx src/App.test.tsx`

Expected: FAIL because the cue component and screen markers are absent.

- [ ] **Step 3: Implement the semantic cue and integrations**

Render `DayRetentionCue` between `.summary-message` and `.summary-stats`. Derive `nextRetentionCue(day.day)` for summary, `retentionCueForDay(highestPlayableDay(save))` for selection, and set the current card's accessible name to include its goal and hook. Keep the existing `startDay` and `openScreen` handlers.

- [ ] **Step 4: Fit the existing plate**

Reduce the performance-message height, add a shallow parchment retention strip, move the stat row down slightly, and preserve upgrade/action coordinates. Style the current-day hook with the existing parchment mask; do not add a modal or new animation.

- [ ] **Step 5: Verify focused screens**

Run: `npm test -- --run src/landscape/dayRetention.test.ts src/components/game/DayRetentionCue.test.tsx src/App.test.tsx src/styles/referenceGameplayComposition.test.ts`

Expected: all tests pass, including existing next-day and lock behavior.

### Task 3: Production flow and visual QA

**Files:**
- Create: `scripts/capture-day-retention-loop-v1.mjs`
- Create: `docs/qa/screenshots/day-retention-loop-v1/summary-next-day-1440x810.png`
- Create: `docs/qa/screenshots/day-retention-loop-v1/current-day-select-1440x810.png`
- Create: `docs/qa/screenshots/day-retention-loop-v1/summary-next-day-844x390.png`
- Create: `docs/qa/screenshots/day-retention-loop-v1/qa-results.json`

**Interfaces:**
- Uses a real production Day 1 run through three completed classic orders to reach summary without QA fixtures.
- Produces exact checks for cue content, specific next action, Day 2 entry, settled save preservation, Day 3 current marker, decoded images, and console errors.

- [ ] **Step 1: Build and start production preview**

Run `npm run build`, start `vite preview` on port 4188, and open Microsoft Edge at 1440×810 with empty campaign/tutorial storage.

- [ ] **Step 2: Complete the real Day 1 shift**

Drive all cooking steps and deliver three classic orders. Require the real summary, capture desktop and 844×390 versions, and verify the cue says `明日 · 饭量挑战` with the big-eater hook.

- [ ] **Step 3: Continue and verify persistence**

Press `明天 · 饭量挑战`, require the Day 2 kitchen, and verify Day 1 stars plus unlocked Day 2 remain in `night-market-campaign-v1`.

- [ ] **Step 4: Capture the production current target**

In a fresh context with settled Day 1–2 data, enter selection, require only Day 3 to contain `[data-current-day-hook]`, and capture at 1440×810.

- [ ] **Step 5: Run all gates and commit**

Run `npm test -- --run`, `npm run build`, `git diff --check`, inspect all three screenshots, commit implementation and QA separately, and require `git status --short` to contain only `output/`.
