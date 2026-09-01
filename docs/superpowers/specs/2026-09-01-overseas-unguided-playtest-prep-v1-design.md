# Overseas Unguided Playtest Prep V1 Design

Date: 2026-09-01

## Goal

Prepare the accepted bilingual game for an unguided overseas Day 1 playtest by adding privacy-friendly, non-blocking telemetry, an isolated playtest/debug mode, optional feedback, a real-flow QA harness, and a shareable static build. The implementation observes the current game; it does not tune or redesign it.

## Frozen Scope

- Do not redesign Home, Settings, Day Select, Gameplay, Summary, English visual surfaces, characters, customers, backgrounds, or upgrade icons.
- Do not change recipes, ingredients, customer generation, patience, economy, scoring, upgrades, target orders, difficulty, tutorial state machine, progression, or save schema.
- Do not add analytics SDKs, accounts, authentication, ads, monetization, multiplayer, leaderboards, or cloud save.
- The existing untracked `output/` directory is user-owned and remains untouched.

Required final declarations:

- `Character assets modified: NO`
- `Core visual system modified: NO`
- `Gameplay balance modified: NO`
- `Campaign/progression modified: NO`

## Chosen Architecture

Use a typed, side-channel analytics adapter. Tracking calls live beside existing UI callbacks and observed state transitions, never inside the kitchen reducer, campaign reducer, save normalization, timers, random generation, or progression logic.

### Files and Responsibilities

- `src/analytics/events.ts`: event names, stable IDs, property maps, envelope types, runtime payload validation.
- `src/analytics/context.ts`: query parsing, anonymous tab-scoped session identity, participant-code sanitization, build and device context.
- `src/analytics/tracker.ts`: the single `trackGameEvent` entry point, timestamps, deduplication, in-memory/sessionStorage buffer, subscriptions, export, and lifecycle checkpoints.
- `src/analytics/sinks.ts`: independent console, GA-compatible, fetch, and beacon delivery functions. Every sink catches its own failure.
- `src/analytics/gameplayObserver.ts`: pure transition helpers that compare previous and current kitchen state and return telemetry observations without mutating either state.
- `src/components/playtest/PlaytestDebugPanel.tsx`: debug-only status, event count, close/collapse control, and JSON export.
- `src/components/playtest/PlaytestFeedbackLink.tsx`: playtest-only, configured-only secondary Summary action.

The adapter is a singleton initialized from `src/main.tsx` before React renders. React components call the exported typed functions directly. This avoids a new Provider and prevents analytics state from causing game rerenders. The debug panel alone subscribes to tracker snapshots.

## Session Semantics

- `sessionStorage` holds a random `crypto.randomUUID()` session ID, session start time, `session_started` marker, dedupe keys, and the playtest event buffer.
- Reloading the same tab preserves the session ID and buffer.
- Every document load emits `game_loaded`.
- `session_started` emits once per tab-scoped session.
- Closing the tab and opening a new tab creates a new session.
- `session_checkpoint` is the reliable drop-off signal. It is emitted on `visibilitychange` when hidden and on `pagehide`, with a short debounce/dedupe window.
- `session_ended` is a best-effort page-lifecycle event emitted on non-persisted `pagehide`. It must not be interpreted as an exact human exit and may be followed by another `game_loaded` with the same session ID after a refresh.

## Privacy and Query Parameters

Supported parameters:

```text
?lang=en&playtest=1
?lang=en&playtest=1&pid=p07
?lang=en&playtest=1&debug=1&pid=p07
```

- `playtest=1` enables the session buffer and playtest logging.
- `debug=1` is ignored unless `playtest=1` is also present.
- `pid` is ignored outside playtest mode. In playtest mode it is accepted only after trimming and matching `[A-Za-z0-9_-]{1,32}`; otherwise it is omitted.
- No names, email, IP-derived values, GPS, addresses, contacts, browser fingerprints, user-entered text, or full user-agent strings are collected.
- Device context is limited to locale, viewport dimensions, touch capability, and a coarse platform value: `mobile`, `tablet`, or `desktop`.

## Event Envelope

Every accepted event is normalized to:

```ts
interface TrackedGameEvent<Name extends GameEventName = GameEventName> {
  event_id: string
  name: Name
  timestamp: string
  t: number
  session_id: string
  day_run_id?: string
  participant_id?: string
  locale: 'en' | 'zh-CN'
  viewport_width: number
  viewport_height: number
  touch: boolean
  platform: 'mobile' | 'tablet' | 'desktop'
  playtest_mode: boolean
  build_version: string
  properties: GameEventProperties[Name]
}
```

`t` is elapsed milliseconds since the tab session began. `build_version` uses `VITE_BUILD_VERSION`, then package version `0.1.0` as a stable fallback.

`day_run_id` is a random anonymous ID created whenever an accepted `startDay` call begins a playable run. It is attached to all day-, tutorial-, cooking-, and Summary-scoped events so Play Again runs can be analyzed independently within one browser session. It contains no gameplay state or participant information.

## Typed Event Schema

| Event | Properties |
| --- | --- |
| `game_loaded` | `{ screen }` |
| `session_started` | `{ screen }` |
| `session_ended` | `{ screen, day?, tutorial_step?, orders_served, elapsed_ms, reason: 'pagehide' }` |
| `session_checkpoint` | `{ screen, day?, tutorial_step?, orders_served, elapsed_ms, reason: 'hidden' \| 'pagehide' }` |
| `home_viewed` | `{}` |
| `start_game_clicked` | `{ day: 1 }` |
| `continue_clicked` | `{ day }` |
| `day_select_opened` | `{ source: 'home' \| 'summary' }` |
| `settings_opened` | `{ source: 'home' }` |
| `day_started` | `{ day, guided_tutorial }` |
| `tutorial_started` | `{ day: 1 }` |
| `tutorial_step_viewed` | `{ step, elapsed_since_tutorial_start_ms }` |
| `tutorial_step_completed` | `{ step, elapsed_since_tutorial_start_ms }` |
| `tutorial_completed` | `{ elapsed_since_tutorial_start_ms }` |
| `first_order_started` | `{ day, recipe_id }` |
| `first_order_completed` | `{ day, recipe_id, duration_ms, mistakes, quality }` |
| `ingredient_selected` | `{ ingredient_id, slot_id? }` |
| `ingredient_placed` | `{ ingredient_id, recipe_id, step_id, slot_id }` |
| `gesture_completed` | `{ gesture_id: 'sauce' \| 'cut' \| 'roll', recipe_id, step_id, slot_id }` |
| `dish_packed` | `{ recipe_id, slot_id }` |
| `serve_attempted` | `{ recipe_id, slot_id, customer_id }` |
| `serve_succeeded` | `{ recipe_id, slot_id, customer_id, quality }` |
| `serve_failed` | `{ recipe_id?, slot_id, customer_id, reason: 'wrong_customer' \| 'not_ready' \| 'unknown' }` |
| `griddle_discarded` | `{ recipe_id?, slot_id }` |
| `help_opened` | `{ screen, day? }` |
| `pause_opened` | `{ day }` |
| `order_timeout` | `{ day, recipe_id, customer_id }` |
| `mistake_recorded` | `{ day, mistake_type, step_id?, slot_id? }` |
| `repeated_mistake` | `{ day, mistake_type, count: 3 }` |
| `day_completed` | `{ day, session_elapsed_ms, day_elapsed_ms, orders_served, average_quality, mistakes, stars, cash }` |
| `summary_viewed` | `{ day, orders_served, average_quality, mistakes, stars, cash }` |
| `play_again_clicked` | `{ day }` |
| `next_day_clicked` | `{ from_day, next_day }` |
| `back_to_day_select_clicked` | `{ from_day }` |
| `feedback_clicked` | `{ day }` |

Stable IDs come from existing domain types. No translated UI copy is stored. `mistake_type` is a closed union derived from rejected ingredient/gesture/serve actions or the existing mistakes counter.

## Trigger and Deduplication Rules

- `home_viewed` and `summary_viewed` fire from actual screen transitions, not component render calls.
- Click funnel events fire in the existing button callbacks immediately before the current navigation action.
- `day_started` fires once per new `KitchenDaySession` instance. A replay creates a new day-run ID and may fire again legitimately.
- The observer keeps previous kitchen state in a ref and emits completed interactions only when the accepted state has changed.
- Tutorial step changes emit completion for the previous step and view for the new step. The initial actual step emits `tutorial_started` and `tutorial_step_viewed`.
- First order timing starts when the first tutorial customer becomes active and ends on the first accepted delivery.
- Delivery records are the source of truth for `serve_succeeded` and `first_order_completed`.
- Customer transitions to disappointed/leaving without a delivery produce `order_timeout`.
- The third occurrence of the same mistake category in one day run emits one `repeated_mistake`; later occurrences do not repeat it.
- Tracker dedupe uses scoped keys for single-transition events: session, document load, day run, tutorial run, and summary visit. React StrictMode and rerenders therefore cannot duplicate `tutorial_started`, `tutorial_completed`, `first_order_completed`, `day_completed`, or `summary_viewed`.
- Invalid names or payloads are rejected locally and never throw into gameplay.

## Analytics Sinks

Events are normalized once and then copied to independent sinks:

1. **Console sink:** enabled in development or playtest mode; logs a compact `[playtest]` record.
2. **Session buffer:** enabled only in playtest mode; stores a bounded maximum of 1,000 events in `sessionStorage`. If the quota is unavailable, it falls back to memory.
3. **GA-compatible sink:** if `window.gtag` exists, sends the event and sanitized properties. `VITE_GA_MEASUREMENT_ID` may be attached as `send_to`; no ID is hardcoded and no SDK dependency is installed.
4. **Custom endpoint:** if `VITE_PLAYTEST_ANALYTICS_ENDPOINT` is a valid HTTP(S) URL, normal events use fire-and-forget `fetch` with `keepalive`; lifecycle events prefer `navigator.sendBeacon`. Network failures are swallowed.

Tracking returns immediately. No sink result is awaited by an interaction handler.

## Playtest Debug Panel and Export

The panel exists only for `?playtest=1&debug=1`. It is fixed, compact, collapsible, closeable, outside document flow, and transparent to pointer input except for its own controls. It shows session prefix, locale, screen, day, tutorial step, event count, and build version.

`Export Events` downloads the current buffered session as UTF-8 JSON containing session metadata and ordered events. The filename contains only the build version and anonymous session prefix.

Normal mode and `?debug=1` without `playtest=1` render no panel markup.

## Feedback Hook

- `VITE_PLAYTEST_FEEDBACK_URL` is validated as HTTP(S).
- The `Give Feedback` link appears only on Summary when playtest mode is enabled and the URL is configured.
- It is visually secondary and added without changing existing Summary actions or layout geometry.
- Clicking it records `feedback_clicked`, then opens the configured URL in a new tab with safe `noopener,noreferrer` behavior.
- No form URL is hardcoded and no button exists when configuration is absent.

## QA Strategy

### Automated Tests

- Event typing and runtime payload rejection.
- Session persistence and participant-code sanitization.
- StrictMode/state-transition dedupe for tutorial completion and Summary.
- Sink-throw and storage-denial isolation.
- Normal versus playtest/debug panel visibility.
- Feedback visibility with and without the environment value.
- Existing gameplay, campaign, i18n, visual, and asset-contract suites remain green.

### Unguided Real-Flow QA

A Playwright script clears both local and session storage, opens `?lang=en&playtest=1`, and uses only visible controls and real pointer/touch gestures. It must not use `playDay`, `qaScreen`, reducer dispatch, storage seeding, or DOM state mutation.

Desktop 1440×810 completes:

```text
Home → Start Game → Day 1 → tutorial → first order → remaining orders → Summary
```

Mobile 844×390 touch mode completes at least:

```text
Home → Start Game → tutorial → first order
```

The script exports a genuine example event session and captures only:

- `playtest-home`
- `playtest-day1-tutorial`
- `playtest-summary`
- `playtest-debug`
- `playtest-day1-mobile`

Observed confusion or clarity issues are recorded without modification unless they are a true P0 blocker.

## Funnel Calculations

Events are deduplicated by `session_id` and `day_run_id` before calculating:

- Start Conversion = sessions with `start_game_clicked` / sessions with `game_loaded`.
- First Order Completion = Day 1 runs with `first_order_completed` / Day 1 runs with `day_started`.
- Tutorial Completion = tutorial runs with `tutorial_completed` / tutorial runs with `tutorial_started`.
- Day 1 Completion = Day 1 runs with `day_completed` / Day 1 runs with `day_started`.
- Day 2 Intent = Day 1 Summary visits with `next_day_clicked` / Day 1 Summary visits with `summary_viewed`.
- Time to First Order = `first_order_completed.t - first_order_started.t` within the same day run.
- Tutorial drop-off is the last `tutorial_step_viewed` without the matching `tutorial_step_completed` before the final checkpoint.

The theoretical sequence is:

```text
Game Loaded
→ Start Clicked
→ Day 1 Started
→ Tutorial Started
→ First Order Completed
→ Tutorial Completed
→ Day 1 Completed
→ Next Day Clicked
```

## Build and Performance

- No third-party analytics package is installed.
- Tracking modules use platform APIs and load with the app; the debug panel is dynamically imported only in debug playtest mode.
- Baseline and final production bundle byte sizes are recorded and compared.
- The final build is produced with `VITE_BUILD_VERSION=0.1.0-overseas-playtest-v1`; the exact source commit SHA is recorded separately in the report.
- `dist/` is packaged as a shareable ZIP outside tracked source files. The report records its SHA-256 checksum and exact launch URL format.

## Acceptance

The event stream must answer whether an anonymous overseas tester loaded the game, started Day 1, reached and completed each tutorial step, completed the first order and how long it took, completed Day 1, and expressed Day 2 intent. Analytics failure must never change or interrupt gameplay.
