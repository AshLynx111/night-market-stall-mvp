# Poki Platform Build V1 Design

Date: 2026-09-01

## Goal

Produce an isolated Poki production target while preserving the current standalone game byte-for-behavior. The Poki target integrates the official HTML5 SDK, reports a deduplicated loading/gameplay lifecycle, offers commercial breaks only at approved natural transitions, fully suspends game time/audio/input during a break, disables external analytics and playtest tools, passes storage-denial and landscape QA, and packages a clean Inspector-ready ZIP.

The accepted game content and visual system are frozen. This work adds only platform infrastructure, platform-controlled suspension, build configuration, tests, QA evidence, and packaging.

## Confirmed Startup Policy

Poki SDK initialization runs in parallel with application/resource startup and has a three-second fail-open deadline. SDK success, rejection, absence, script failure, or timeout cannot prevent Home from becoming usable. Platform lifecycle calls are queued behind initialization settlement so their order remains deterministic.

## Frozen Scope

Do not modify characters, customer art, backgrounds, visual style, copy, recipes, ingredients, customer generation, patience values, target orders, economy, upgrade prices, scoring, campaign progression, save schema, tutorial state machine, Day 1 flow, Day 2–6 content, or difficulty.

Required final declarations:

- `Character assets modified: NO`
- `Gameplay balance modified: NO`
- `Campaign/progression modified: NO`
- `Save schema modified: NO`

The pre-existing untracked `output/` directory is user-owned and remains untouched.

## Official SDK Contract

The Poki target uses the official v2 SDK URL:

```text
https://game-cdn.poki.com/scripts/v2/poki-sdk.js
```

The integration follows the current official HTML5 lifecycle:

- `PokiSDK.init()` at startup, with fail-open behavior.
- `PokiSDK.gameLoadingFinished()` when the mounted Home is actually ready and current critical resources have completed loading.
- `PokiSDK.gameplayStart()` when interactive cooking begins or resumes.
- `PokiSDK.gameplayStop()` when cooking is interrupted, completed, or left.
- `PokiSDK.commercialBreak()` at a natural transition before gameplay resumes.

References:

- <https://developers.poki.com/guide/sdk-html5>
- <https://developers.poki.com/guide/sdk-overview>
- <https://developers.poki.com/guide/requirements-quality>

No rewarded-ad UI or economic reward is added. The adapter may reserve an optional rewarded method, but production UI never calls it.

## Architecture

### Platform adapter

Create focused modules under `src/platform/`:

- `types.ts`: `PlatformId`, `GamePlatform`, SDK type, lifecycle state, and snapshot interfaces.
- `standalone.ts`: immediate no-op adapter.
- `poki.ts`: official SDK wrapper with safe global detection, three-second initialization deadline, warning-only failures, and guarded SDK calls.
- `platform.ts`: compile-time platform selection, singleton initialization, and exported build flags.
- `lifecycle.ts`: a singleton controller that owns loading completion, desired gameplay activity, active gameplay state, ad serialization, suspension, subscriptions, and development event logging.
- `react.ts`: a small `useSyncExternalStore` bridge for platform suspension state.

React and gameplay modules never reference `window.PokiSDK`. Only `poki.ts` can do so.

### Compile-time isolation

`VITE_PLATFORM` accepts `standalone` or `poki`; absence means `standalone`. A Vite `poki` mode supplies `VITE_PLATFORM=poki`, outputs to `dist-poki/`, and injects the official SDK script into the HTML head with asynchronous loading. The normal `npm run build` continues to output `dist/` and must contain no Poki SDK URL or runtime request.

The Poki build uses compile-time conditions to remove the playtest debug import. It also forces playtest/debug mode, event export, remote feedback, GA-compatible delivery, and custom analytics endpoint delivery off even if query parameters or environment variables are present.

### Lifecycle controller

The controller owns these state values outside React so StrictMode remounts cannot duplicate calls:

```ts
type PlatformLifecyclePhase = 'loading' | 'menu' | 'playing' | 'paused' | 'ad' | 'summary' | 'event'

interface PlatformSnapshot {
  platformId: 'standalone' | 'poki'
  initialized: boolean
  loadingFinished: boolean
  gameplayActive: boolean
  breakActive: boolean
  phase: PlatformLifecyclePhase
}
```

Its public operations are:

```ts
initializePlatformLifecycle(): Promise<void>
markPlatformLoadingFinished(): void
setPlatformGameplayDesired(active: boolean, phase: PlatformLifecyclePhase): void
runPlatformCommercialBreak(continueAction: () => void | Promise<void>): Promise<void>
subscribePlatform(listener: () => void): () => void
getPlatformSnapshot(): PlatformSnapshot
```

`setPlatformGameplayDesired` is edge-triggered. It calls `gameplayStart` only for inactive → active and `gameplayStop` only for active → inactive. It stores the latest desired state while initialization or an ad is pending, then flushes it in the legal order. There can be no `start → start`, `stop → stop`, or start before a pending commercial break resolves.

`markPlatformLoadingFinished` is once-per-document and flushes only after adapter initialization settles. If the player enters gameplay unusually early, the controller still emits loading finished before gameplay start.

## Loading Readiness

`main.tsx` starts analytics and platform initialization before rendering, but it does not await Poki. React mounts immediately. Loading readiness is marked after `window.load` (or immediately if already complete), current document images have decoded or settled, and two animation frames have allowed the accepted Home controls to mount. No new loading screen is introduced.

The controller waits for SDK initialization success/failure/timeout before forwarding `gameLoadingFinished`; gameplay remains usable during that wait.

## Gameplay State Mapping

A single effect in `LandscapeGame` derives desired gameplay state from existing UI state plus platform suspension:

| Existing state | Platform state |
| --- | --- |
| Home, Settings, Day Select | menu / inactive |
| Playing with no menu/help/abandon/ad | playing / active |
| Pause menu, Help, Abandon confirmation | paused / inactive |
| Day 5 non-interactive event | event / inactive |
| Summary | summary / inactive |
| Commercial break | ad / inactive |

Start Game, Continue, and a playable Day card enter gameplay directly without an advertisement. Because the lifecycle controller is a singleton and edge-triggered, React StrictMode cannot duplicate the SDK sequence.

## Commercial Break Opportunities

Only three existing player intents request a commercial opportunity:

1. Summary → Play Again.
2. Summary → Next Day.
3. Playing pause menu → Resume/Continue Cooking, including dialog close via its existing close path.

Back to Day Select, opening pause, help close, abandon-confirm cancel, Day 5 event resume, first Start Game, Continue, and Day-card entry do not request ads in V1. No timer, cooldown, counter, banner, rewarded placement, or other ad provider is added.

The transition contract is:

```text
inactive gameplay
→ synchronous platform suspension
→ commercialBreak()
→ success/rejection/absence handled identically
→ existing continuation action
→ suspension released
→ derived playing state causes one gameplayStart()
```

Concurrent break requests reuse the in-flight promise and cannot execute continuation actions twice. Buttons are protected by the global suspension lock during the request.

## Advertisement Suspension

### Game time

The existing kitchen reducer already ignores `TICK` while paused. `platformBreakActive` is added to the existing `paused` expression passed to `KitchenDaySession`, so customer patience and cooking heat remain frozen throughout the break. No timer or reducer semantics change.

### Audio

Add an in-memory platform suspension flag to both audio engines:

- BGM uses `userMuted || platformSuspended` for `HTMLAudioElement.muted` and zeroes only the live mix while suspended.
- Kitchen effects and sizzle refuse new playback while suspended and immediately stop active nodes.

The controller sets suspension synchronously before calling the SDK and restores it in `finally`. It never writes audio settings or campaign storage, so the player's exact master/music/effects/mute values return after the ad.

### Input

During a break:

- `useGameplayShortcuts` receives `enabled=false`.
- Kitchen receives the existing paused state.
- A fixed transparent platform input-lock element covers the app and intercepts pointer/touch input.
- Existing Summary and dialog controls behind the ad cannot be activated.

The lock is build-neutral, has no visual redesign, and exists only while `breakActive=true`.

## Failure Behavior

All platform errors fail open:

- SDK script missing or late: warn in development, settle initialization after three seconds, continue standalone-like behavior.
- `init()` rejects or throws: mark initialized and continue.
- Lifecycle method missing or throws: swallow after a warning; controller state still advances.
- `commercialBreak()` rejects, throws, or never becomes available: release suspension and perform the requested continuation exactly once.

Production UI never exposes an SDK error screen.

## Analytics and Playtest Isolation

For Poki builds:

- `playtest=1`, `debug=1`, and `pid` are ignored.
- No debug panel chunk, export control, or feedback link is emitted/rendered.
- Existing `window.gtag`, `VITE_GA_MEASUREMENT_ID`, `VITE_PLAYTEST_ANALYTICS_ENDPOINT`, and `VITE_PLAYTEST_FEEDBACK_URL` are ignored even when set accidentally.
- The internal in-memory typed tracker may still support game-owned observations, but it has no remote sinks and does not use a sessionStorage playtest buffer.

Standalone retains the accepted analytics/playtest behavior unchanged.

## Storage-Denial Behavior

Automated browser QA overrides `localStorage` and `sessionStorage` accessors/methods to throw before application code runs. Existing save, audio, locale, guided-tutorial, and analytics reads/writes must remain guarded. A fresh user must still reach Home, start Day 1, and complete the first order in memory. Persistence loss is acceptable; a blank page or blocked game is not.

## Build and External Request Audit

Add:

```text
npm run build:poki
npm run test:poki
```

The Poki build outputs `dist-poki/`. Static and runtime audits assert:

- standalone `dist/` contains no Poki SDK URL or Poki runtime reference that can make a request;
- Poki `dist-poki/` contains exactly the official SDK integration path;
- no GA, custom analytics, feedback, Google Fonts, CDN image/audio, remote CSS, other ad SDK, CrazyGames, or source-map request is present;
- all game images, audio, styles, code, and any fonts are local bundle assets;
- debug and QA artifacts are absent from `dist-poki/`.

Playwright intercepts the official SDK URL with a deterministic mock during local production-build QA. This verifies the real HTML integration without depending on live Poki availability.

## Automated Tests

Unit and integration coverage includes:

1. Standalone adapter no-op behavior.
2. Poki initialization success, rejection, absence, and timeout fail-open.
3. Loading finished exactly once and after initialization settlement.
4. Gameplay start/stop edge deduplication and StrictMode stability.
5. No gameplay start before player intent.
6. Pause/help/abandon/day complete/event/menu lifecycle mapping.
7. Pause resume and Summary continuation ordering: stop → break → start.
8. Commercial rejection still continues and resumes.
9. Two-second mock break freezes patience, heat, screen transition, and save.
10. Temporary BGM/effects suspension and exact user-setting restoration.
11. Keyboard and pointer/touch input rejection during a break.
12. Poki build remote analytics/debug/feedback exclusion.
13. Standalone build SDK exclusion and immediate Play Again/Next Day regression.
14. Storage-denial Home → Day 1 → first-order flow.

## Production QA

The mock-backed Poki production build follows:

```text
Load
→ Home
→ Start Game
→ Day 1
→ Pause
→ Resume through commercial opportunity
→ Complete Day 1
→ Summary
→ Next Day through commercial opportunity
→ Day 2
```

Expected sequence:

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

There may be additional legal stop/start pairs for explicitly tested Help, Abandon, or Day 5 event transitions, but never duplicate adjacent starts/stops and never a start while a break is unresolved.

Viewport coverage:

- Desktop/mouse: 640×360, 836×470, 1031×580, 1440×810.
- Touch: 640×360 and 836×470, completing ingredient tap, gesture, Pack, and Serve paths.
- Portrait: the accepted in-game rotate UI remains; no browser alert.

For each landscape viewport, QA records overflow, crop/safe-area observations, event order, console/page errors, and screenshots only where useful. Experience issues that are not P0/P1 platform blockers are recorded rather than redesigned.

## Size Accounting and Packaging

Measure standalone and Poki production outputs separately:

- ZIP total bytes.
- Initial JS and CSS bytes.
- First-screen production network bytes.
- Additional bytes requested after entering Day 1.
- Delta against the current standalone baseline.

Create `artifacts/night-market-poki-build-v1.zip` from the contents of `dist-poki/`, not the directory itself. The ZIP root contains `index.html` and `assets/`. It excludes source, docs, screenshots, tests, source maps, QA scripts/data, Git files, and `node_modules`.

The output is prepared for drag-and-drop to Poki Inspector. If the authenticated Inspector cannot be run from this environment, the report states exactly `Poki Inspector: NOT RUN`; it does not claim a pass.

## Git and Acceptance

Work occurs on `codex/poki-platform-build-v1`, starting from `bb80e89` so all accepted telemetry hardening remains present. Do not merge main. Use focused platform, lifecycle, break, build, and QA commits.

Acceptance requires both builds to pass tests and runtime audits, the Poki mock lifecycle to match the legal order, the two-second ad freeze to preserve game/save/audio/input state, storage-denial play to reach the first order, the clean ZIP to validate, no P0/P1 submission blocker, and all four frozen-scope declarations to remain `NO`.
