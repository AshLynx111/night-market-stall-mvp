# Overseas Unguided Playtest Prep V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or execute this plan inline task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add privacy-friendly typed telemetry, isolated playtest/debug tooling, optional feedback, genuine unguided Day 1 QA, and a shareable static build without changing gameplay or accepted visuals.

**Architecture:** A singleton side-channel tracker normalizes typed events and fans them out to failure-isolated browser-native sinks. Pure state-transition observers and existing UI callbacks produce events without touching reducers, saves, timers, random generation, campaign logic, or accepted art.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest/jsdom, Playwright, browser `sessionStorage`, `fetch`, `sendBeacon`, and `Blob` APIs.

## Global Constraints

- Branch: `codex/overseas-playtest-prep-v1`; do not merge `main`.
- Do not redesign Home, Settings, Day Select, Gameplay UI, Summary, English visual surfaces, characters, customers, backgrounds, or upgrade icons.
- Do not modify recipes, ingredients, customer generation, patience, economy, scoring, upgrade costs, target orders, day difficulty, tutorial state machine, campaign progression, or save schema.
- Do not install an analytics SDK or add accounts, authentication, ads, monetization, leaderboards, multiplayer, or cloud save.
- Analytics must be non-blocking, asynchronous, fail-silent, and independent of gameplay state.
- Never collect names, email, IP, GPS, precise addresses, fingerprints, contacts, user-entered text, or full user-agent strings.
- Leave the existing untracked `output/` directory untouched.
- Final declarations must be `Character assets modified: NO`, `Core visual system modified: NO`, `Gameplay balance modified: NO`, and `Campaign/progression modified: NO`.

---

### Task 1: Typed analytics foundation and baseline measurement

**Files:**
- Create: `src/analytics/events.ts`
- Create: `src/analytics/context.ts`
- Create: `src/analytics/sinks.ts`
- Create: `src/analytics/tracker.ts`
- Create: `src/analytics/events.test.ts`
- Create: `src/analytics/tracker.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `GameEventName`, `GameEventProperties`, `TrackedGameEvent`, `trackGameEvent`, `initializeAnalytics`, `beginAnalyticsDayRun`, `setAnalyticsCheckpoint`, `getPlaytestConfig`, `getAnalyticsSnapshot`, `readAnalyticsEvents`, `subscribeAnalytics`, `exportAnalyticsSession`, `configureAnalyticsSinksForTests`, and `resetAnalyticsForTests`.
- Consumes: `Locale` from `src/i18n/types.ts`, browser query parameters, sessionStorage, and optional Vite environment values.

- [ ] **Step 1: Record the unchanged baseline production bundle**

Run:

```powershell
npm run build
Get-ChildItem -LiteralPath dist/assets -File | Group-Object Extension | ForEach-Object { [pscustomobject]@{ Extension = $_.Name; Bytes = ($_.Group | Measure-Object Length -Sum).Sum } }
```

Expected: build passes; retain the JavaScript and CSS byte totals for the final report. Do not commit `dist/`.

- [ ] **Step 2: Write failing schema and tracker isolation tests**

Create tests that exercise these exact public calls:

```ts
const event = trackGameEvent('day_started', { day: 1, guided_tutorial: true })
expect(event?.name).toBe('day_started')
expect(event?.properties).toEqual({ day: 1, guided_tutorial: true })

expect(() => trackGameEvent('day_started', null as never)).not.toThrow()
expect(trackGameEvent('day_started', null as never)).toBeNull()

configureAnalyticsSinksForTests([() => { throw new Error('offline') }])
expect(() => trackGameEvent('home_viewed', {})).not.toThrow()

trackGameEvent('tutorial_completed', { elapsed_since_tutorial_start_ms: 5000 }, { onceKey: 'tutorial:1' })
trackGameEvent('tutorial_completed', { elapsed_since_tutorial_start_ms: 5000 }, { onceKey: 'tutorial:1' })
expect(readAnalyticsEvents().filter(({ name }) => name === 'tutorial_completed')).toHaveLength(1)
```

Also test that a valid `pid=p07` is attached only in playtest mode, an invalid or overlong participant code is omitted, and the same tab session ID survives reinitialization.

- [ ] **Step 3: Run the focused tests and verify failure**

Run:

```powershell
npm test -- src/analytics/events.test.ts src/analytics/tracker.test.ts
```

Expected: FAIL because `src/analytics/` does not exist.

- [ ] **Step 4: Implement the closed event map and runtime validators**

Define the event map exactly as the approved spec. The public generic must prevent an event from receiving another event's payload:

```ts
export type GameEventName = keyof GameEventProperties

export function isValidGameEvent<Name extends GameEventName>(
  name: Name,
  properties: unknown,
): properties is GameEventProperties[Name] {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return false
  return EVENT_VALIDATORS[name](properties as Record<string, unknown>)
}

export interface TrackOptions {
  onceKey?: string
  lifecycle?: boolean
}
```

Use reusable finite-number, integer, boolean, closed-string-union, and optional-property validators. Reject unknown event names, non-object payloads, non-finite numbers, invalid stable IDs, and translated text fields.

- [ ] **Step 5: Implement session context, sinks, bounded storage, and dedupe**

Use these storage keys and limits:

```ts
export const ANALYTICS_SESSION_KEY = 'night-market-playtest-session-v1'
export const ANALYTICS_BUFFER_KEY = 'night-market-playtest-events-v1'
export const MAX_BUFFERED_EVENTS = 1_000
export const DEFAULT_BUILD_VERSION = '0.1.0'
```

`initializeAnalytics()` must parse `playtest=1`, `debug=1`, and `pid`; restore or create the tab-scoped session; attach lifecycle listeners once; and never throw. `trackGameEvent()` must normalize synchronously, append to memory/sessionStorage only in playtest mode, notify debug subscribers, and schedule each sink in `queueMicrotask` with an internal `try/catch`.

Implement sink activation as:

```ts
const consoleEnabled = import.meta.env.DEV || context.playtestMode
const endpoint = safeHttpUrl(import.meta.env.VITE_PLAYTEST_ANALYTICS_ENDPOINT)
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || undefined
```

Custom endpoint delivery uses `fetch(endpoint, { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body })`. Lifecycle delivery uses `navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))` when available. GA delivery calls existing `window.gtag`; do not load an SDK.

- [ ] **Step 6: Initialize the adapter before React render**

Modify `src/main.tsx` to run:

```ts
import { initializeAnalytics } from './analytics/tracker'

initializeAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
```

- [ ] **Step 7: Run focused tests and build**

Run:

```powershell
npm test -- src/analytics/events.test.ts src/analytics/tracker.test.ts
npm run build
```

Expected: all focused tests pass and production build succeeds.

- [ ] **Step 8: Commit the analytics foundation**

```powershell
git add src/analytics src/main.tsx
git commit -m "feat: add typed playtest analytics events"
```

---

### Task 2: Pure kitchen transition observer

**Files:**
- Create: `src/analytics/gameplayObserver.ts`
- Create: `src/analytics/gameplayObserver.test.ts`

**Interfaces:**
- Consumes: `KitchenState`, `TutorialStep`, stable `IngredientId`, `RecipeId`, and `SlotId`.
- Produces: `observeKitchenTransition(previous, current): KitchenObservation[]` and `KitchenInteractionIntent`.

- [ ] **Step 1: Write failing transition tests**

Cover these exact transitions with existing kitchen state fixtures:

```ts
expect(observeKitchenTransition(beforeNoodle, afterNoodle)).toContainEqual({
  kind: 'ingredient_placed', ingredientId: 'noodle', recipeId: 'classic', stepId: 'noodle', slotId: 'left',
})
expect(observeKitchenTransition(beforeTutorialStep, afterTutorialStep)).toContainEqual({
  kind: 'tutorial_step_changed', previousStep: 'egg', currentStep: 'wait-egg',
})
expect(observeKitchenTransition(beforeDelivery, afterDelivery)).toContainEqual(expect.objectContaining({
  kind: 'delivery_completed', recipeId: 'classic', quality: expect.any(Number),
}))
expect(observeKitchenTransition(beforeTimeout, afterTimeout)).toContainEqual(expect.objectContaining({
  kind: 'order_timeout', recipeId: 'classic',
}))
```

Assert the function does not mutate either input and returns `[]` for identical states.

- [ ] **Step 2: Run the observer test and verify failure**

Run:

```powershell
npm test -- src/analytics/gameplayObserver.test.ts
```

Expected: FAIL because the observer module is absent.

- [ ] **Step 3: Implement observation unions and comparisons**

Use a closed union:

```ts
export type KitchenObservation =
  | { kind: 'tutorial_step_changed'; previousStep: TutorialStep; currentStep: TutorialStep }
  | { kind: 'ingredient_placed'; ingredientId: IngredientId; recipeId: RecipeId; stepId: string; slotId: SlotId }
  | { kind: 'gesture_completed'; gestureId: 'sauce' | 'cut' | 'roll'; recipeId: RecipeId; stepId: string; slotId: SlotId }
  | { kind: 'dish_packed'; recipeId: RecipeId; slotId: SlotId }
  | { kind: 'delivery_completed'; recipeId: RecipeId; slotId: SlotId; customerId: string; quality: number }
  | { kind: 'order_timeout'; recipeId: RecipeId; customerId: string }
  | { kind: 'mistake_recorded'; mistakeType: MistakeType; stepId?: string; slotId?: SlotId }
```

Compare completed-step arrays, slot phases, new delivery records, customer presence/mood, tutorial step, and mistake count. Read only existing state; do not import or call `kitchenReducer`.

- [ ] **Step 4: Run observer and existing reducer tests**

Run:

```powershell
npm test -- src/analytics/gameplayObserver.test.ts src/landscape/kitchen/state.test.ts src/landscape/kitchen/tutorialPaths.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit the observer**

```powershell
git add src/analytics/gameplayObserver.ts src/analytics/gameplayObserver.test.ts
git commit -m "feat: observe kitchen telemetry transitions"
```

---

### Task 3: Instrument the Home, day, tutorial, first-order, completion, and Summary funnels

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Create: `src/analytics/funnelIntegration.test.tsx`

**Interfaces:**
- Consumes: tracker functions and `observeKitchenTransition`.
- Produces: real screen/day/tutorial/order funnel events and up-to-date checkpoint state.

- [ ] **Step 1: Write failing integration tests**

Render the real app under `StrictMode`, interact through buttons, and assert buffered events:

```ts
expect(eventNames()).toEqual(expect.arrayContaining(['game_loaded', 'session_started', 'home_viewed']))
click('.home-hotspot--start')
expect(lastEvent('start_game_clicked')?.properties).toEqual({ day: 1 })
expect(lastEvent('day_started')?.properties).toEqual({ day: 1, guided_tutorial: true })
rerenderSameTree()
expect(eventsNamed('day_started')).toHaveLength(1)
```

Add tests for Continue versus Start, Settings, Day Select, Play Again, Next Day, Back to Day Selection, help, pause, Summary dedupe, and `setAnalyticsCheckpoint` values.

- [ ] **Step 2: Run integration tests and verify failure**

Run:

```powershell
npm test -- src/analytics/funnelIntegration.test.tsx
```

Expected: FAIL because no screen funnel events are emitted.

- [ ] **Step 3: Add screen-level tracking without changing handlers' existing results**

Add a screen-transition effect and explicit button-source callbacks:

```ts
useEffect(() => {
  setAnalyticsCheckpoint({ screen, day: screen === 'playing' || screen === 'summary' ? day.day : undefined, ordersServed: served })
  if (screen === 'home') trackGameEvent('home_viewed', {}, { onceKey: `home:${screenVisit.current}` })
  if (screen === 'summary') trackGameEvent('summary_viewed', summaryProperties, { onceKey: `summary:${dayRunId}` })
}, [screen, day.day, served, summaryProperties])
```

Create distinct callbacks for Start, Continue, Settings, Day Select, Play Again, Next Day, and Back to Day Selection. Each callback tracks immediately before invoking the unchanged `startDay` or `openScreen` behavior.

- [ ] **Step 4: Observe KitchenDaySession transitions**

Call `beginAnalyticsDayRun(day)` inside the accepted `startDay` path and pass the returned anonymous `dayRunId` into `KitchenDaySession`. In `KitchenDaySession`, retain previous kitchen state and timing refs, map `KitchenObservation` values to typed events, update the checkpoint after each state transition, and dedupe with keys scoped to `dayRunId`. The tracker automatically attaches `day_run_id` to later day-, tutorial-, cooking-, and Summary-scoped events.

Use existing delivery and completion data for:

```ts
trackGameEvent('first_order_completed', {
  day: day.day,
  recipe_id: delivery.recipeId,
  duration_ms: performance.now() - firstOrderStartedAt.current,
  mistakes: state.mistakes,
  quality: delivery.quality,
}, { onceKey: `first-order:${dayRunId}` })
```

Emit `day_completed` in `finishDay` before the unchanged save/progression update. Emit `tutorial_completed` only on the existing guided-to-complete transition.

- [ ] **Step 5: Run funnel integration and all kitchen tests**

Run:

```powershell
npm test -- src/analytics/funnelIntegration.test.tsx src/landscape/kitchen src/i18n/appLocale.test.tsx
```

Expected: all pass; StrictMode does not duplicate once-only events.

- [ ] **Step 6: Commit the funnel instrumentation**

```powershell
git add src/components/LandscapeGame.tsx src/analytics/funnelIntegration.test.tsx
git commit -m "feat: instrument day one player funnel"
```

---

### Task 4: Instrument high-value cooking intents and failure signals

**Files:**
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Create: `src/analytics/cookingIntegration.test.tsx`

**Interfaces:**
- Consumes: `KitchenInteractionIntent` callback supplied by `KitchenDaySession`.
- Produces: ingredient-selection, serve-attempt, failed-serve, and discard intents; accepted outcomes remain transition-derived.

- [ ] **Step 1: Write failing interaction tests**

Use real rendered controls and assert:

```ts
tapIngredient('noodle')
expect(lastEvent('ingredient_selected')?.properties.ingredient_id).toBe('noodle')
attemptServe('left', 'customer-incorrect')
expect(eventNames()).toContain('serve_attempted')
expect(eventNames()).toContain('serve_failed')
discardSlot('right')
expect(lastEvent('griddle_discarded')?.properties.slot_id).toBe('right')
```

Verify no pointer-move event exists and a rejected action does not produce `ingredient_placed` or `serve_succeeded`.

- [ ] **Step 2: Run interaction tests and verify failure**

Run:

```powershell
npm test -- src/analytics/cookingIntegration.test.tsx
```

Expected: FAIL because KitchenScene has no telemetry callback.

- [ ] **Step 3: Add a non-gameplay callback to KitchenScene**

Extend props with:

```ts
onTelemetryIntent?: (intent: KitchenInteractionIntent) => void
```

Call it only from existing accepted tool selection and user-attempt paths. Do not wrap `dispatch`, change action values, or add pointer-move listeners. `dispatchScene` continues to perform the same tutorial validation; telemetry receives the stable ingredient, gesture, slot, recipe, and customer IDs already present at that point.

- [ ] **Step 4: Map intents and mistake counters to events**

`KitchenDaySession` maps intents to `ingredient_selected`, `serve_attempted`, `serve_failed`, and `griddle_discarded`. Accepted placements, gestures, packing, and serving remain emitted only by `observeKitchenTransition`. Emit `repeated_mistake` exactly when one closed mistake category reaches count three in the current day run.

- [ ] **Step 5: Run focused tests and verify no reducer changes**

Run:

```powershell
npm test -- src/analytics/cookingIntegration.test.tsx src/landscape/kitchen
git diff --exit-code efde34d8 -- src/landscape/kitchen/reducer.ts src/landscape/campaign.ts src/landscape/progression.ts
```

Expected: tests pass and the frozen core files have no diff.

- [ ] **Step 6: Commit cooking telemetry**

```powershell
git add src/components/game/KitchenScene.tsx src/components/LandscapeGame.tsx src/analytics/cookingIntegration.test.tsx
git commit -m "feat: track high value cooking interactions"
```

---

### Task 5: Isolated playtest debug panel and event export

**Files:**
- Create: `src/components/playtest/PlaytestDebugPanel.tsx`
- Create: `src/components/playtest/PlaytestDebugPanel.test.tsx`
- Create: `src/styles/playtest.css`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `getPlaytestConfig`, `subscribeAnalytics`, `getAnalyticsSnapshot`, and `exportAnalyticsSession`.
- Produces: debug-only session status and a JSON download.

- [ ] **Step 1: Write failing visibility and export tests**

Test these URLs:

```ts
expect(renderPath('/?lang=en').querySelector('[data-playtest-debug]')).toBeNull()
expect(renderPath('/?lang=en&debug=1').querySelector('[data-playtest-debug]')).toBeNull()
expect(renderPath('/?lang=en&playtest=1&debug=1').querySelector('[data-playtest-debug]')).not.toBeNull()
```

Click Export Events, spy on `URL.createObjectURL`, and assert the Blob JSON has ordered events and no sensitive fields.

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- src/components/playtest/PlaytestDebugPanel.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the lazy debug panel**

Render only when both flags are true:

```tsx
const PlaytestDebugPanel = lazy(() => import('./playtest/PlaytestDebugPanel'))

{playtest.debugMode && (
  <Suspense fallback={null}>
    <PlaytestDebugPanel />
  </Suspense>
)}
```

The panel shows session prefix, locale, screen, day, tutorial step, event count, and build version. Close removes it for the current document; collapse retains a one-line tab. Export uses a Blob and a temporary anchor, then revokes the object URL.

- [ ] **Step 4: Add isolated CSS**

Import `src/styles/playtest.css` from `main.tsx`. Use fixed positioning, safe-area offsets, `z-index`, `pointer-events: none` on the shell, and `pointer-events: auto` only on panel controls. Do not modify existing selectors.

- [ ] **Step 5: Run tests and visual-contract checks**

Run:

```powershell
npm test -- src/components/playtest/PlaytestDebugPanel.test.tsx src/styles/englishVisualPolish.test.ts src/styles/referenceGameplayComposition.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit isolated playtest mode**

```powershell
git add src/components/playtest src/styles/playtest.css src/components/LandscapeGame.tsx src/main.tsx
git commit -m "feat: add isolated playtest mode"
```

---

### Task 6: Optional Summary feedback hook

**Files:**
- Create: `src/components/playtest/PlaytestFeedbackLink.tsx`
- Create: `src/components/playtest/PlaytestFeedbackLink.test.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/styles/playtest.css`

**Interfaces:**
- Consumes: sanitized `VITE_PLAYTEST_FEEDBACK_URL`, playtest mode, current day, and `trackGameEvent`.
- Produces: an optional secondary `Give Feedback` link on Summary.

- [ ] **Step 1: Write failing feedback visibility tests**

Assert:

```ts
vi.stubEnv('VITE_PLAYTEST_FEEDBACK_URL', '')
expect(renderSummary('/?playtest=1').queryByRole('link', { name: 'Give Feedback' })).toBeNull()

vi.stubEnv('VITE_PLAYTEST_FEEDBACK_URL', 'https://example.test/form')
expect(renderSummary('/?playtest=1').getByRole('link', { name: 'Give Feedback' })).toHaveAttribute('href', 'https://example.test/form')
expect(renderSummary('/').queryByRole('link', { name: 'Give Feedback' })).toBeNull()
```

Click the configured link and assert one `feedback_clicked` event with the current day.

- [ ] **Step 2: Run the test and verify failure**

Run:

```powershell
npm test -- src/components/playtest/PlaytestFeedbackLink.test.tsx
```

Expected: FAIL because no feedback component exists.

- [ ] **Step 3: Implement configured-only feedback**

Validate the environment value with `new URL`; accept only `http:` and `https:`. Render an anchor with `target="_blank"` and `rel="noopener noreferrer"` only when both playtest mode and a valid URL are present. Add `playtest.feedback` translations: English `Give Feedback`, Chinese `提供试玩反馈`.

- [ ] **Step 4: Add a secondary Summary placement**

Place the component after the existing Summary action group. Style only `.playtest-feedback-link`; keep it smaller and lower contrast than the existing Next Day action and do not change the action group's geometry.

- [ ] **Step 5: Run feedback, i18n, and Summary tests**

Run:

```powershell
npm test -- src/components/playtest/PlaytestFeedbackLink.test.tsx src/i18n/core.test.ts src/i18n/appLocale.test.tsx src/styles/englishVisualPolish.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit the feedback hook**

```powershell
git add src/components/playtest/PlaytestFeedbackLink.tsx src/components/playtest/PlaytestFeedbackLink.test.tsx src/components/LandscapeGame.tsx src/i18n/en.ts src/i18n/zh-CN.ts src/styles/playtest.css
git commit -m "feat: add optional playtest feedback hook"
```

---

### Task 7: Genuine desktop and mobile unguided playtest QA

**Files:**
- Create: `scripts/capture-overseas-playtest-prep-v1.mjs`
- Create: `docs/qa/screenshots/overseas-playtest-prep-v1/playtest-home-1440x810.png`
- Create: `docs/qa/screenshots/overseas-playtest-prep-v1/playtest-day1-tutorial-1440x810.png`
- Create: `docs/qa/screenshots/overseas-playtest-prep-v1/playtest-summary-1440x810.png`
- Create: `docs/qa/screenshots/overseas-playtest-prep-v1/playtest-debug-1440x810.png`
- Create: `docs/qa/screenshots/overseas-playtest-prep-v1/playtest-day1-mobile-844x390.png`
- Create: `docs/qa/screenshots/overseas-playtest-prep-v1/example-session.json`
- Create: `docs/qa/screenshots/overseas-playtest-prep-v1/qa-results.json`
- Create: `docs/qa/overseas-playtest-prep-v1.md`

**Interfaces:**
- Consumes: the public UI at `?lang=en&playtest=1` and `?lang=en&playtest=1&debug=1` only.
- Produces: five screenshots, genuine event evidence, observed issues, funnel definitions, and a full QA report.

- [ ] **Step 1: Implement a no-fixture Playwright flow**

The script must assert that its URL does not contain `playDay`, `qaScreen`, `qaServedOrders`, or other QA state parameters. Before navigation, clear `localStorage` and `sessionStorage`. Interact only through visible buttons, ingredient controls, griddle pointer gestures, meal-box controls, and customer targets.

Use a helper with this contract:

```js
async function completeClassicOrder(page, inputMode) {
  await selectIngredient(page, 'noodle', inputMode)
  await selectIngredient(page, 'egg', inputMode)
  await waitForTutorialStep(page, 'hot-dog')
  await selectIngredient(page, 'hot-dog', inputMode)
  await waitForTutorialStep(page, 'sauce')
  await selectIngredient(page, 'sauce', inputMode)
  await performSauceGesture(page, 'left', inputMode)
  await selectIngredient(page, 'scallion', inputMode)
  await performThreeCuts(page, 'left', inputMode)
  await performRoll(page, 'left', inputMode)
  await packDish(page, 'left', inputMode)
  await serveDish(page, 'left', inputMode)
}
```

Each helper derives coordinates from current DOM rectangles; no hardcoded reducer state or storage seed is allowed.

- [ ] **Step 2: Complete desktop Day 1 and mobile first order**

Desktop 1440×810 uses mouse input and completes all three Day 1 orders through Summary. Mobile 844×390 creates a touch-enabled context and completes the first order. Record whether Start, customer arrival, cooking sequence, and Summary actions are understandable; log findings without editing UI.

- [ ] **Step 3: Capture only the five required screenshots and export real events**

Capture the named screenshots at their required viewports. Read the playtest buffer only after the UI-driven session completes, write it unchanged to `example-session.json`, and assert this ordered subsequence:

```text
game_loaded
start_game_clicked
day_started
tutorial_started
first_order_completed
tutorial_completed
day_completed
summary_viewed
```

Also assert every tutorial step has a view event and each non-terminal step has a completion event.

- [ ] **Step 4: Run QA and inspect all five screenshots manually**

Run:

```powershell
node scripts/capture-overseas-playtest-prep-v1.mjs
```

Expected: zero console/page errors, zero viewport overflow, real Day 1 completion on desktop, real first-order completion on mobile, and debug UI absent outside its one dedicated screenshot.

- [ ] **Step 5: Write the final QA report**

Include the 22 requested report sections: change summary, files, full schema, trigger map, URL forms, participant codes, sinks, debug/export, feedback config, desktop/mobile QA, simulated funnel, build, tests, performance delta, P0 blockers, recorded-only issues, and all four frozen declarations.

- [ ] **Step 6: Commit QA evidence**

```powershell
git add -f scripts/capture-overseas-playtest-prep-v1.mjs docs/qa/overseas-playtest-prep-v1.md docs/qa/screenshots/overseas-playtest-prep-v1
git commit -m "test: add unguided playtest qa"
```

---

### Task 8: Full verification, performance delta, and shareable build

**Files:**
- Modify: `docs/qa/overseas-playtest-prep-v1.md`
- Generate, do not commit: `artifacts/night-market-overseas-playtest-v1.zip`

**Interfaces:**
- Consumes: final source tree and baseline bundle totals.
- Produces: verified release archive, SHA-256, final report, and clean scoped Git history.

- [ ] **Step 1: Run the complete test and asset suites**

Run:

```powershell
npm test -- --run
npm run validate:art
```

Expected: every test and asset validation passes.

- [ ] **Step 2: Build with the final build identifier**

Run:

```powershell
$env:VITE_BUILD_VERSION = '0.1.0-overseas-playtest-v1'
npm run build
Remove-Item Env:\VITE_BUILD_VERSION
```

Expected: TypeScript and Vite production build succeed.

- [ ] **Step 3: Measure final bundle and record delta**

Run the same extension byte-total command from Task 1. Record absolute and percentage JavaScript/CSS change in the report. Confirm there is no analytics SDK chunk and no new initial network dependency.

- [ ] **Step 4: Package and checksum the shareable build**

Resolve `D:\game_demo\artifacts` as the exact target, create it if absent, and archive only `dist/*`:

```powershell
$artifactDir = [System.IO.Path]::GetFullPath('D:\game_demo\artifacts')
if ($artifactDir -ne 'D:\game_demo\artifacts') { throw 'Unexpected artifact directory' }
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
$archive = Join-Path $artifactDir 'night-market-overseas-playtest-v1.zip'
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive }
Compress-Archive -Path 'D:\game_demo\dist\*' -DestinationPath $archive -CompressionLevel Optimal
Get-FileHash -LiteralPath $archive -Algorithm SHA256
```

Expected: ZIP exists and contains `index.html` plus production assets. Record SHA-256 and byte size.

- [ ] **Step 5: Audit frozen scope and repository cleanliness**

Run:

```powershell
git diff --name-status efde34d8..HEAD
git diff --exit-code efde34d8 -- src/assets src/landscape/campaign.ts src/landscape/progression.ts src/landscape/kitchen/reducer.ts
git status --short
```

Expected: no frozen art/core file changes; only the pre-existing untracked `output/` remains outside the planned source, test, QA, and documentation changes.

- [ ] **Step 6: Update and commit final verification facts**

Use `apply_patch` to replace preliminary report values with exact test counts, bundle bytes/delta, archive size/hash, P0 result, and observed-only issues. Then run:

```powershell
git add -f docs/qa/overseas-playtest-prep-v1.md
git commit -m "docs: finalize overseas playtest handoff"
git diff --check efde34d8..HEAD
```

Expected: report contains no estimates or placeholders and diff check is clean.
