# Poki Platform Build V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, fail-open Poki HTML5 target with correct loading/gameplay/ad lifecycle, full ad suspension, clean networking, production QA, and an Inspector-ready ZIP without changing standalone behavior or game content.

**Architecture:** A compile-time-selected `GamePlatform` adapter isolates the official SDK. A singleton lifecycle controller outside React deduplicates loading/start/stop calls, serializes commercial breaks, and exposes suspension through `useSyncExternalStore`; React maps its existing screen/dialog state into one desired-gameplay signal. The Poki Vite mode injects the official SDK and strips remote analytics/playtest surfaces, while standalone retains its current build and behavior.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest/jsdom, Playwright 1.62, official Poki HTML5 SDK v2.

## Global Constraints

- Work only on `codex/poki-platform-build-v1`; do not merge main.
- Default `npm run build` remains standalone and outputs `dist/`.
- `npm run build:poki` uses `VITE_PLATFORM=poki` semantics and outputs `dist-poki/`.
- Poki SDK startup runs in parallel with a 3,000 ms fail-open deadline.
- Only the Poki build may request `https://game-cdn.poki.com/scripts/v2/poki-sdk.js`.
- Do not add rewarded-ad UI, internal ad frequency logic, any other ad SDK, SEO, or gameplay features.
- Poki builds disable GA, custom analytics endpoints, playtest remote sinks, feedback, debug UI, and export even if env/query values exist.
- Ad opportunities are limited to Play Again, Next Day, and Resume from the playing pause menu.
- During a break, game time is paused, all audio is temporarily suspended, and pointer/touch/keyboard input is blocked; user audio settings are not persisted or changed.
- All SDK failures fail open and execute the requested continuation exactly once.
- Preserve the current characters, visuals, copy, recipes, ingredients, patience, economy, scoring, tutorial, campaign, progression, and save schema.
- Preserve the user-owned untracked `output/` directory.
- Final declarations must be `Character assets modified: NO`, `Gameplay balance modified: NO`, `Campaign/progression modified: NO`, and `Save schema modified: NO`.

---

### Task 1: Compile-time platform identity and standalone adapter

**Files:**
- Create: `src/platform/types.ts`
- Create: `src/platform/build.ts`
- Create: `src/platform/standalone.ts`
- Create: `src/platform/standalone.test.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Vite `mode` and `import.meta.env.VITE_PLATFORM`.
- Produces: `GamePlatform`, `PokiSdk`, `PLATFORM_ID`, `IS_POKI_BUILD`, `standalonePlatform`, and separate `dist`/`dist-poki` build targets.

- [ ] **Step 1: Write the failing standalone adapter and build-identity tests**

Create `src/platform/standalone.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { standalonePlatform } from './standalone'

describe('standalone platform', () => {
  it('is an immediate no-op for every lifecycle operation', async () => {
    await expect(standalonePlatform.initialize()).resolves.toBeUndefined()
    expect(() => standalonePlatform.loadingFinished()).not.toThrow()
    expect(() => standalonePlatform.gameplayStart()).not.toThrow()
    expect(() => standalonePlatform.gameplayStop()).not.toThrow()
    await expect(standalonePlatform.commercialBreak()).resolves.toBeUndefined()
  })

  it('does not read a Poki global', async () => {
    const getter = vi.fn(() => { throw new Error('Poki should not be read') })
    Object.defineProperty(window, 'PokiSDK', { configurable: true, get: getter })
    await standalonePlatform.initialize()
    expect(getter).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
npx vitest run --config vitest.config.ts src/platform/standalone.test.ts --maxWorkers=1
```

Expected: FAIL because `src/platform/standalone.ts` does not exist.

- [ ] **Step 3: Implement the platform types, build flag, and no-op adapter**

Create `src/platform/types.ts`:

```ts
export type PlatformId = 'standalone' | 'poki'

export interface PokiSdk {
  init(): Promise<void>
  gameLoadingFinished(): void
  gameplayStart(): void
  gameplayStop(): void
  commercialBreak(onAdStart?: () => void): Promise<void>
  rewardedBreak?(onAdStart?: () => void): Promise<boolean>
}

export interface GamePlatform {
  readonly id: PlatformId
  initialize(): Promise<void>
  loadingFinished(): void
  gameplayStart(): void
  gameplayStop(): void
  commercialBreak(): Promise<void>
  rewardedBreak?(): Promise<boolean>
}
```

Create `src/platform/build.ts`:

```ts
import type { PlatformId } from './types'

export const PLATFORM_ID: PlatformId = import.meta.env.VITE_PLATFORM === 'poki' ? 'poki' : 'standalone'
export const IS_POKI_BUILD = PLATFORM_ID === 'poki'
```

Create `src/platform/standalone.ts`:

```ts
import type { GamePlatform } from './types'

export const standalonePlatform: GamePlatform = {
  id: 'standalone',
  async initialize() {},
  loadingFinished() {},
  gameplayStart() {},
  gameplayStop() {},
  async commercialBreak() {},
  async rewardedBreak() { return false },
}
```

- [ ] **Step 4: Add deterministic Vite platform modes without adding a dependency**

Replace `vite.config.ts` with a `defineConfig(({ mode }) => ...)` factory. Derive `platformId` as `mode === 'poki' ? 'poki' : 'standalone'`, define `import.meta.env.VITE_PLATFORM`, keep `base: './'`, set `build.outDir` to `dist-poki` only for Poki, and add this Poki-only HTML transform tag:

```ts
{
  tag: 'script',
  attrs: {
    id: 'poki-sdk',
    src: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js',
    async: true,
  },
  injectTo: 'head',
}
```

Add to `package.json`:

```json
"build:poki": "tsc -b && vite build --mode poki",
"test:poki": "npm run build:poki && node scripts/qa-poki-platform-build-v1.mjs"
```

- [ ] **Step 5: Run the test and both builds**

Run:

```powershell
npx vitest run --config vitest.config.ts src/platform/standalone.test.ts --maxWorkers=1
npm run build
npm run build:poki
```

Expected: test passes; standalone writes `dist/`; Poki writes `dist-poki/`; only `dist-poki/index.html` contains the official SDK URL.

- [ ] **Step 6: Commit the platform foundation**

```powershell
git add package.json vite.config.ts src/platform/types.ts src/platform/build.ts src/platform/standalone.ts
git add -f src/platform/standalone.test.ts
git commit -m "refactor: add game platform adapter"
```

---

### Task 2: Fail-open Poki SDK adapter and compile-time selection

**Files:**
- Create: `src/platform/poki.ts`
- Create: `src/platform/poki.test.ts`
- Create: `src/platform/platform.ts`
- Create: `src/platform/platform.test.ts`

**Interfaces:**
- Consumes: `GamePlatform`, `PokiSdk`, `PLATFORM_ID`, asynchronous SDK script injection from Task 1.
- Produces: `createPokiPlatform(options)`, `getConfiguredPlatform()`, `initializeConfiguredPlatform()`, and a Poki wrapper that never throws into the game.

- [ ] **Step 1: Write failing success, rejection, missing-SDK, timeout, and call-safety tests**

Create `src/platform/poki.test.ts` with fake timers and injected dependencies:

```ts
const sdk = {
  init: vi.fn(async () => undefined),
  gameLoadingFinished: vi.fn(),
  gameplayStart: vi.fn(),
  gameplayStop: vi.fn(),
  commercialBreak: vi.fn(async () => undefined),
}

const platform = createPokiPlatform({
  resolveSdk: () => sdk,
  timeoutMs: 3_000,
  pollMs: 25,
})

await platform.initialize()
expect(sdk.init).toHaveBeenCalledTimes(1)
platform.loadingFinished()
platform.gameplayStart()
platform.gameplayStop()
await platform.commercialBreak()
expect(sdk.commercialBreak).toHaveBeenCalledTimes(1)
```

Add cases where `init` rejects, every lifecycle method throws, `commercialBreak` rejects, and `resolveSdk` stays undefined until fake time reaches 3,000 ms. Every public adapter call must resolve/not throw.

- [ ] **Step 2: Run the tests and verify failure**

```powershell
npx vitest run --config vitest.config.ts src/platform/poki.test.ts src/platform/platform.test.ts --maxWorkers=1
```

Expected: FAIL because the modules are absent.

- [ ] **Step 3: Implement a deadline-bounded SDK resolver and safe wrapper**

Implement `createPokiPlatform` with this dependency shape:

```ts
interface PokiPlatformOptions {
  resolveSdk?: () => PokiSdk | undefined
  timeoutMs?: number
  pollMs?: number
  warn?: (message: string, error?: unknown) => void
}
```

Store the first initialization promise, poll for `window.PokiSDK`, and place the entire resolve-plus-init chain inside a 3,000 ms `Promise.race`. On failure or timeout, retain `sdk=null` and resolve. Wrap every SDK method in `try/catch`; `commercialBreak` also catches promise rejection. Do not retry initialization later in the same document.

- [ ] **Step 4: Implement compile-time-selected singleton creation**

In `src/platform/platform.ts`, use a cached promise and a dynamic Poki import:

```ts
let platformPromise: Promise<GamePlatform> | null = null

export function getConfiguredPlatform() {
  platformPromise ??= PLATFORM_ID === 'poki'
    ? import('./poki').then(({ createPokiPlatform }) => createPokiPlatform())
    : Promise.resolve(standalonePlatform)
  return platformPromise
}

export async function initializeConfiguredPlatform() {
  const platform = await getConfiguredPlatform()
  await platform.initialize()
  return platform
}
```

Export a test reset only from a clearly named test helper or under `resetConfiguredPlatformForTests`.

- [ ] **Step 5: Run focused tests and build-reference audits**

```powershell
npx vitest run --config vitest.config.ts src/platform/poki.test.ts src/platform/platform.test.ts --maxWorkers=1
npm run build
npm run build:poki
rg -n "game-cdn\.poki\.com|PokiSDK" dist
rg -n "game-cdn\.poki\.com|PokiSDK" dist-poki
```

Expected: tests pass; standalone search returns no runtime SDK reference; Poki contains only the intended adapter/script integration.

- [ ] **Step 6: Commit the SDK adapter**

```powershell
git add src/platform/poki.ts src/platform/platform.ts
git add -f src/platform/poki.test.ts src/platform/platform.test.ts
git commit -m "feat: add isolated poki sdk adapter"
```

---

### Task 3: Deduplicated platform lifecycle controller and loading readiness

**Files:**
- Create: `src/platform/lifecycle.ts`
- Create: `src/platform/lifecycle.test.ts`
- Create: `src/platform/loading.ts`
- Create: `src/platform/loading.test.ts`
- Create: `src/platform/react.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `initializeConfiguredPlatform()` and `GamePlatform`.
- Produces: `createPlatformLifecycleController`, singleton lifecycle exports, readiness scheduling, and `usePlatformSnapshot()`.

- [ ] **Step 1: Write failing lifecycle ordering and dedupe tests**

Use a mock adapter that appends these strings to an array:

```ts
const controller = createPlatformLifecycleController({
  initialize: async () => platform,
  setAudioSuspended: vi.fn(),
})

controller.markLoadingFinished()
controller.setGameplayDesired(true, 'playing')
await controller.whenIdle()
expect(log).toEqual(['init', 'loadingFinished', 'gameplayStart'])

controller.setGameplayDesired(true, 'playing')
controller.setGameplayDesired(false, 'paused')
controller.setGameplayDesired(false, 'paused')
await controller.whenIdle()
expect(log).toEqual(['init', 'loadingFinished', 'gameplayStart', 'gameplayStop'])
```

Add StrictMode-like repeated calls, state changes before initialization resolves, loading-finished twice, and the prohibition on adjacent duplicate start/stop.

- [ ] **Step 2: Write failing commercial serialization tests**

Use a deferred break promise:

```ts
controller.setGameplayDesired(false, 'paused')
const continuation = vi.fn()
const pending = controller.runCommercialBreak(continuation)
expect(controller.getSnapshot().breakActive).toBe(true)
expect(log.at(-1)).toBe('commercialBreak:start')

controller.setGameplayDesired(true, 'playing')
expect(log).not.toContain('gameplayStart:after-break')
resolveBreak()
await pending
await controller.whenIdle()
expect(continuation).toHaveBeenCalledTimes(1)
expect(log.slice(-3)).toEqual(['commercialBreak:start', 'commercialBreak:end', 'gameplayStart'])
```

Add reject/throw behavior and two concurrent calls; only the first continuation executes and suspension always clears.

- [ ] **Step 3: Run focused tests and verify failure**

```powershell
npx vitest run --config vitest.config.ts src/platform/lifecycle.test.ts src/platform/loading.test.ts --maxWorkers=1
```

- [ ] **Step 4: Implement the controller as a serialized edge-triggered state machine**

Keep controller state outside React. Queue adapter work on a private promise, expose `whenIdle()` for tests, notify subscribers after snapshots change, and implement:

```ts
interface PlatformLifecycleController {
  initialize(): Promise<void>
  markLoadingFinished(): void
  setGameplayDesired(active: boolean, phase: PlatformLifecyclePhase): void
  runCommercialBreak(continueAction: () => void | Promise<void>): Promise<void>
  getSnapshot(): PlatformSnapshot
  subscribe(listener: () => void): () => void
  whenIdle(): Promise<void>
}
```

Before a break, require desired gameplay to be inactive; synchronously set `breakActive`, phase `ad`, and audio suspension. Await the platform break, run the continuation once, release audio in `finally`, clear break state, then flush the latest desired gameplay edge. All failures remain internal.

- [ ] **Step 5: Implement current-page readiness and React subscription**

`schedulePlatformLoadingFinished` waits for `window.load` when needed, then settles every current `document.images` decode/load state, waits two animation frames, and calls the supplied once-guarded callback. `src/platform/react.ts` uses:

```ts
export function usePlatformSnapshot() {
  return useSyncExternalStore(
    platformLifecycle.subscribe,
    platformLifecycle.getSnapshot,
    platformLifecycle.getSnapshot,
  )
}
```

In `main.tsx`, call `platformLifecycle.initialize()` without awaiting, render the existing app immediately, then schedule `platformLifecycle.markLoadingFinished()`.

- [ ] **Step 6: Run tests and verify StrictMode stability**

```powershell
npx vitest run --config vitest.config.ts src/platform/lifecycle.test.ts src/platform/loading.test.ts src/App.test.tsx --maxWorkers=1
```

- [ ] **Step 7: Commit lifecycle infrastructure**

```powershell
git add src/platform/lifecycle.ts src/platform/loading.ts src/platform/react.ts src/main.tsx
git add -f src/platform/lifecycle.test.ts src/platform/loading.test.ts
git commit -m "feat: add poki gameplay lifecycle controller"
```

---

### Task 4: Temporary platform audio suspension

**Files:**
- Modify: `src/game/audio.ts`
- Modify: `src/game/audio.test.ts`
- Modify: `src/game/bgm.ts`
- Modify: `src/game/bgm.test.ts`
- Create: `src/game/platformAudio.ts`
- Create: `src/game/platformAudio.test.ts`
- Modify: `src/platform/lifecycle.ts`

**Interfaces:**
- Consumes: lifecycle controller suspension callback.
- Produces: `setKitchenPlatformAudioSuspended`, `setBgmPlatformAudioSuspended`, and `setGamePlatformAudioSuspended` without modifying `AudioSettings`.

- [ ] **Step 1: Write failing BGM restoration tests**

Extend `bgm.test.ts`:

```ts
await unlockAndPlayBgm(settings({ master: .7, music: .6, musicMuted: false }))
setBgmPlatformAudioSuspended(true)
expect(instances[0].muted).toBe(true)
expect(instances[0].volume).toBe(0)

setBgmPlatformAudioSuspended(false)
expect(instances[0].muted).toBe(false)
expect(instances[0].volume).toBeCloseTo(.42)
```

Add a user-muted case that remains muted after platform suspension clears.

- [ ] **Step 2: Write failing kitchen-audio blocking tests**

Extend `audio.test.ts` to start sizzle/tone, suspend, verify active nodes stop, attempt new playback while suspended, verify no new nodes, clear suspension, and verify playback is allowed again.

- [ ] **Step 3: Run focused tests and verify failure**

```powershell
npx vitest run --config vitest.config.ts src/game/audio.test.ts src/game/bgm.test.ts src/game/platformAudio.test.ts --maxWorkers=1
```

- [ ] **Step 4: Implement separate in-memory platform flags**

In `bgm.ts`, retain the latest user settings and calculate:

```ts
const effectiveMuted = settings.musicMuted || platformAudioSuspended
bgm.volume = effectiveMuted ? 0 : settings.master * settings.music
bgm.muted = effectiveMuted
```

In `audio.ts`, gate every context/tone/sizzle start on both `kitchenAudioEnabled` and `!platformAudioSuspended`; setting suspension true immediately calls `stopAllKitchenAudio()`.

In `platformAudio.ts`:

```ts
export function setGamePlatformAudioSuspended(suspended: boolean) {
  setBgmPlatformAudioSuspended(suspended)
  setKitchenPlatformAudioSuspended(suspended)
}
```

Wire this callback into the singleton lifecycle controller. Never call `saveAudioSettings` from platform code.

- [ ] **Step 5: Run audio and existing settings tests**

```powershell
npx vitest run --config vitest.config.ts src/game/audio.test.ts src/game/bgm.test.ts src/game/audioSettings.test.ts src/game/platformAudio.test.ts --maxWorkers=1
```

- [ ] **Step 6: Commit temporary audio suspension**

```powershell
git add src/game/audio.ts src/game/bgm.ts src/game/platformAudio.ts src/platform/lifecycle.ts
git add -f src/game/audio.test.ts src/game/bgm.test.ts src/game/platformAudio.test.ts
git commit -m "feat: suspend game audio during platform breaks"
```

---

### Task 5: React lifecycle mapping, commercial opportunities, and input lock

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/LandscapeGame.tsx`
- Create: `src/components/platform/PlatformInputLock.tsx`
- Create: `src/components/platform/PlatformInputLock.test.tsx`
- Create: `src/platform/gameplayIntegration.test.tsx`
- Modify: `src/landscape.css`

**Interfaces:**
- Consumes: `usePlatformSnapshot`, `setPlatformGameplayDesired`, `runPlatformCommercialBreak`.
- Produces: one state-to-lifecycle mapping, approved ad placements, `platformBreakActive` pause/input propagation, and global pointer/keyboard blocking.

- [ ] **Step 1: Write failing player-intent and lifecycle mapping tests**

Render the real app under StrictMode with a mock controller and assert:

```ts
expect(platformLog).toEqual([])
clickButton('Start Game')
expect(platformLog).toEqual(['gameplayStart'])
rerenderSameTree()
expect(platformLog).toEqual(['gameplayStart'])

clickHudPause()
expect(platformLog.at(-1)).toBe('gameplayStop')
```

Add Help, Abandon confirmation, return to selection, Day 5 event, Day Complete, Home/Settings/Select/Summary inactive, Continue, and playable Day-card start cases. Assert no adjacent duplicate starts/stops.

- [ ] **Step 2: Write failing commercial-order tests**

Use a deferred mock break and assert:

```ts
clickPauseResume()
expect(platformLog.slice(-2)).toEqual(['gameplayStop', 'commercialBreak:start'])
expect(screen()).toBe('playing')
expect(isPauseDialogOpen()).toBe(true)
resolveBreak()
await settled()
expect(platformLog.slice(-3)).toEqual(['commercialBreak:start', 'commercialBreak:end', 'gameplayStart'])
```

Repeat for Play Again and Next Day. Reject the break and assert the day/resume action still occurs once. Assert first Start, Continue, Help close, abandon cancel, and Day-card entry do not call `commercialBreak`.

- [ ] **Step 3: Write failing input-lock tests**

Render `PlatformInputLock active`; dispatch keyboard shortcuts and pointer events at controls behind it. Assert capture listeners prevent default/propagation, the overlay has fixed full-viewport geometry, and inactive mode has no lock DOM/listeners.

- [ ] **Step 4: Run tests and verify failure**

```powershell
npx vitest run --config vitest.config.ts src/platform/gameplayIntegration.test.tsx src/components/platform/PlatformInputLock.test.tsx --maxWorkers=1
```

- [ ] **Step 5: Add one derived lifecycle effect to LandscapeGame**

Accept `platformBreakActive=false` as a prop. Derive:

```ts
const gameplayInterrupted = dialogOpen || screen === 'event' || platformBreakActive
const gameplayActive = screen === 'playing' && !gameplayInterrupted
const platformPhase = platformBreakActive ? 'ad'
  : screen === 'summary' ? 'summary'
  : screen === 'event' ? 'event'
  : screen === 'playing' ? gameplayInterrupted ? 'paused' : 'playing'
  : 'menu'
```

One effect calls `setPlatformGameplayDesired(gameplayActive, platformPhase)`. Add `platformBreakActive` to `useGameplayShortcuts.enabled`, the `KitchenDaySession.paused` prop, and `backgroundInert`.

- [ ] **Step 6: Route only approved continuation callbacks through the break controller**

Keep existing analytics calls and game mutations intact. Change playing pause `closeMenu`, Summary Play Again, and Summary Next Day to:

```ts
void runPlatformCommercialBreak(() => {
  // existing setShowMenu(false) or startDay(...) call
})
```

When Summary's final-day action returns to selection, do not request a break. Do not alter first Start/Continue/Day-card callbacks.

- [ ] **Step 7: Mount the input lock without layout changes**

`App` reads the platform snapshot, passes `breakActive` to `LandscapeGame`, and renders `<PlatformInputLock active={breakActive} />` as a sibling. The lock uses a document-level capture listener for `keydown`, `keyup`, `pointerdown`, `pointerup`, and `click` while active plus a fixed transparent overlay with a test-only data attribute. CSS is isolated to `.platform-input-lock`.

- [ ] **Step 8: Run integration and full existing App/Kitchen tests**

```powershell
npx vitest run --config vitest.config.ts src/platform/gameplayIntegration.test.tsx src/components/platform/PlatformInputLock.test.tsx src/App.test.tsx src/components/game/KitchenScene.test.tsx --maxWorkers=1
```

- [ ] **Step 9: Commit lifecycle integration and break flow**

```powershell
git add src/App.tsx src/components/LandscapeGame.tsx src/components/platform/PlatformInputLock.tsx src/landscape.css
git add -f src/components/platform/PlatformInputLock.test.tsx src/platform/gameplayIntegration.test.tsx
git commit -m "feat: add poki commercial break flow"
```

---

### Task 6: Poki analytics, feedback, debug, and external-request isolation

**Files:**
- Modify: `src/analytics/context.ts`
- Modify: `src/analytics/context.test.ts` or extend `src/analytics/tracker.test.ts`
- Modify: `src/analytics/sinks.ts`
- Modify: `src/analytics/tracker.test.ts`
- Modify: `src/components/playtest/PlaytestFeedbackLink.tsx`
- Modify: `src/components/playtest/PlaytestFeedbackLink.test.tsx`
- Modify: `src/App.tsx`
- Create: `src/platform/buildIsolation.test.ts`
- Create: `scripts/audit-platform-builds.mjs`

**Interfaces:**
- Consumes: `IS_POKI_BUILD`, `dist/`, and `dist-poki/`.
- Produces: build-time disabled external telemetry/playtest surfaces and a deterministic static audit.

- [ ] **Step 1: Write failing Poki isolation tests**

Reset modules after `vi.stubEnv('VITE_PLATFORM', 'poki')`, configure query `?playtest=1&debug=1&pid=p07`, and assert:

```ts
expect(createAnalyticsContext().playtestMode).toBe(false)
expect(createAnalyticsContext().debugMode).toBe(false)
expect(createAnalyticsContext().participantId).toBeUndefined()
expect(createDefaultAnalyticsSinks(context)).toEqual([])
expect(configuredFeedbackUrl()).toBeUndefined()
```

Set every external analytics/feedback env variable and an existing `window.gtag`; the Poki tests must still observe zero fetch, beacon, gtag, feedback, debug, and export calls.

- [ ] **Step 2: Run isolation tests and verify failure**

```powershell
npx vitest run --config vitest.config.ts src/platform/buildIsolation.test.ts src/analytics/tracker.test.ts src/components/playtest/PlaytestFeedbackLink.test.tsx --maxWorkers=1
```

- [ ] **Step 3: Gate playtest context and all external sinks at compile time**

In `createAnalyticsContext`, require `!IS_POKI_BUILD` before accepting `playtest`, `debug`, or `pid`. In `createDefaultAnalyticsSinks`, immediately return `[]` for Poki. In `configuredFeedbackUrl`, return undefined for Poki before reading env.

In `App.tsx`, define the lazy debug component only in the standalone compile-time branch so Rollup can remove the dynamic import from Poki output.

- [ ] **Step 4: Implement the static build audit**

`scripts/audit-platform-builds.mjs` recursively reads text-like production files and asserts:

- standalone contains neither `game-cdn.poki.com` nor `PokiSDK`;
- Poki `index.html` contains the official SDK URL exactly once;
- Poki output contains no configured GA/feedback/analytics URL, `googletagmanager`, `google-analytics`, Google Fonts, CrazyGames, AdSense, source map, `PlaytestDebugPanel` chunk, QA JSON, tests, or source tree;
- every other `http://`/`https://` occurrence is rejected with its file path.

- [ ] **Step 5: Run focused tests, builds, and audit**

```powershell
npx vitest run --config vitest.config.ts src/platform/buildIsolation.test.ts src/analytics/tracker.test.ts src/components/playtest/PlaytestFeedbackLink.test.tsx --maxWorkers=1
npm run build
npm run build:poki
node scripts/audit-platform-builds.mjs
```

- [ ] **Step 6: Commit clean Poki production isolation**

```powershell
git add src/App.tsx src/analytics/context.ts src/analytics/sinks.ts src/components/playtest/PlaytestFeedbackLink.tsx scripts/audit-platform-builds.mjs
git add -f src/platform/buildIsolation.test.ts src/analytics/tracker.test.ts src/components/playtest/PlaytestFeedbackLink.test.tsx
git commit -m "build: isolate clean poki production target"
```

---

### Task 7: Storage-denial and two-second advertisement freeze coverage

**Files:**
- Create: `src/platform/adFreeze.test.tsx`
- Create: `src/platform/storageFailure.test.tsx`

**Interfaces:**
- Consumes: real App, deferred mock platform, kitchen data attributes, browser storage APIs.
- Produces: regression proof that ads freeze the live game and denied storage cannot blank the app.

- [ ] **Step 1: Add a real-component two-second break test**

Use the real Day 1 UI to reach an active cooking state, open Pause, start Resume with a deferred commercial promise, and snapshot:

```ts
const before = {
  patience: activeCustomerPatience(),
  heat: leftSlotHeat(),
  screen: currentScreen(),
  save: campaignSaveText(),
}

await vi.advanceTimersByTimeAsync(2_000)
expect(activeCustomerPatience()).toBe(before.patience)
expect(leftSlotHeat()).toBe(before.heat)
expect(currentScreen()).toBe(before.screen)
expect(campaignSaveText()).toBe(before.save)
expect(platformAudioSuspended()).toBe(true)
expect(gameplayInputAttempt()).toLeaveStateUnchanged()
```

Resolve the break, assert one gameplay start, restored audio, unlocked input, and resumed patience/heat.

- [ ] **Step 2: Add denied local/session storage tests**

Before rendering, define throwing `getItem`, `setItem`, and storage getters. Render the real App, assert Home, click Start Game, operate the first ingredient control, and confirm Day 1 remains playable without an uncaught error. Restore property descriptors in `afterEach`.

- [ ] **Step 3: Run tests and fix only demonstrated guard gaps**

```powershell
npx vitest run --config vitest.config.ts src/platform/adFreeze.test.tsx src/platform/storageFailure.test.tsx --maxWorkers=1
```

Expected: tests pass using the existing guarded access in `LandscapeGame.tsx`, `I18nProvider.tsx`, `audioSettings.ts`, and the analytics context. A failure is a blocker for this task and must be diagnosed before proceeding; no schema change is permitted.

- [ ] **Step 4: Run all platform and core regression tests**

```powershell
npx vitest run --config vitest.config.ts src/platform src/game/audio.test.ts src/game/bgm.test.ts src/App.test.tsx src/components/game/KitchenScene.test.tsx --maxWorkers=1
```

- [ ] **Step 5: Commit hardening tests**

```powershell
git add -f src/platform/adFreeze.test.tsx src/platform/storageFailure.test.tsx
git commit -m "test: harden poki breaks and storage failure"
```

---

### Task 8: Production mock QA, size accounting, clean ZIP, and final report

**Files:**
- Create: `scripts/qa-poki-platform-build-v1.mjs`
- Create: `docs/qa/poki-platform-build-v1.md`
- Create: `docs/qa/screenshots/poki-platform-build-v1/*.png`
- Generate, do not commit: `artifacts/night-market-poki-build-v1.zip`

**Interfaces:**
- Consumes: final `dist/`, `dist-poki/`, official SDK URL intercepted with a deterministic Playwright mock.
- Produces: required lifecycle log, viewport/touch/storage/network evidence, exact bundle metrics, upload ZIP, checksum, and 32-section handoff report.

- [ ] **Step 1: Implement a production-build Poki SDK mock route**

The Playwright script starts `vite preview --outDir dist-poki` on a fixed local port. Before navigation, route the exact official SDK URL and fulfill JavaScript that installs:

```js
window.__pokiMockEvents = []
window.__resolveCommercialBreak = null
window.PokiSDK = {
  init: async () => { window.__pokiMockEvents.push('init') },
  gameLoadingFinished: () => window.__pokiMockEvents.push('gameLoadingFinished'),
  gameplayStart: () => window.__pokiMockEvents.push('gameplayStart'),
  gameplayStop: () => window.__pokiMockEvents.push('gameplayStop'),
  commercialBreak: () => new Promise((resolve) => {
    window.__pokiMockEvents.push('commercialBreak:start')
    window.__resolveCommercialBreak = () => {
      window.__pokiMockEvents.push('commercialBreak:end')
      resolve()
    }
  }),
}
```

Collect every other request URL, console error, and page error.

- [ ] **Step 2: Automate the complete Poki lifecycle through visible UI**

Clear storage, open Home, assert loading finished once and no gameplay start, click Start, operate Day 1, open Pause, click Resume, hold the mock break unresolved for 2,000 ms, verify patience/heat/screen/storage/audio/input freeze, resolve, complete Day 1, click Next Day, resolve the second break, and assert Day 2.

Reject duplicate adjacent start/stop entries and assert this ordered subsequence:

```text
gameLoadingFinished
gameplayStart
gameplayStop
commercialBreak:start
commercialBreak:end
gameplayStart
gameplayStop
commercialBreak:start
commercialBreak:end
gameplayStart
```

Add a separate commercial rejection case that still resumes.

- [ ] **Step 3: Cover all required viewports and touch operations**

Run production Poki contexts for:

```text
640×360 mouse
836×470 mouse
1031×580 mouse
1440×810 mouse
640×360 touch
836×470 touch
390×844 portrait rotate screen
```

For every landscape context, assert zero horizontal/vertical overflow and visible HUD, customer, rack, both griddles, Pack, and Serve areas. Touch contexts complete a first order with Chromium `Input.dispatchTouchEvent` for sauce, cuts, and roll. Portrait asserts the in-game rotate UI and absence of browser alerts.

- [ ] **Step 4: Add browser storage-denial and network audits**

Use an init script that makes local/session storage getters and methods throw, then complete Home → Start → first ingredient/first order without page errors. For normal Poki QA, allow only local preview requests plus the intercepted official SDK URL. Fail on analytics, feedback, fonts, remote media/CSS, or other third-party requests.

- [ ] **Step 5: Measure initial and Day 1 network bytes**

Record response body or `encodedBodySize` bytes for all local production resources through Home readiness. After Start Game reaches Day 1 and required images settle, calculate newly requested Day 1 bytes. Separately total on-disk initial JS, lazy chunks, CSS, and complete build assets for standalone and Poki.

- [ ] **Step 6: Run full validation and production QA**

```powershell
npm test -- --run
npm run validate:art
npm run build
npm run build:poki
node scripts/audit-platform-builds.mjs
node scripts/qa-poki-platform-build-v1.mjs
```

Expected: 100% tests and asset validation pass; both builds succeed; audits report only the official Poki SDK request; all required viewport/storage/lifecycle assertions pass.

- [ ] **Step 7: Package and verify the exact Poki ZIP**

```powershell
$artifactDir = [System.IO.Path]::GetFullPath('D:\game_demo\artifacts')
if ($artifactDir -ne 'D:\game_demo\artifacts') { throw 'Unexpected artifact directory' }
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
$archive = Join-Path $artifactDir 'night-market-poki-build-v1.zip'
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive }
Compress-Archive -Path 'D:\game_demo\dist-poki\*' -DestinationPath $archive -CompressionLevel Optimal
Get-FileHash -LiteralPath $archive -Algorithm SHA256
```

Open the ZIP with `System.IO.Compression.ZipFile`; assert root `index.html`, root `assets/`, no enclosing `dist-poki/`, and no source maps/source/docs/tests/QA/Git files.

- [ ] **Step 8: Write the exact 32-section final report**

`docs/qa/poki-platform-build-v1.md` must include all requested sections: change summary, adapter architecture, standalone behavior, init, loading trigger, every start/stop/break trigger, ad lock, audio/input suspension, request audit, incognito, desktop/mobile and each required viewport, standalone regression, event log, tests, builds, bundle/network deltas, ZIP path/size/hash, `Poki Inspector: NOT RUN` unless actually run, P0/P1 blockers, and the four frozen declarations.

- [ ] **Step 9: Audit frozen scope and repository cleanliness**

```powershell
git diff --exit-code bb80e89 -- src/assets src/landscape/campaign.ts src/landscape/progression.ts src/landscape/kitchen/reducer.ts
git diff --check bb80e89..HEAD
git status --short
```

Expected: frozen files have no diff; only planned work plus the pre-existing untracked `output/` exists.

- [ ] **Step 10: Commit QA evidence and final report**

```powershell
git add -f scripts/qa-poki-platform-build-v1.mjs docs/qa/poki-platform-build-v1.md docs/qa/screenshots/poki-platform-build-v1
git commit -m "test: add poki lifecycle and build qa"
git diff --check bb80e89..HEAD
```

Do not commit `dist/`, `dist-poki/`, the ZIP, or `output/`.
