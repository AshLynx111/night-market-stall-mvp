# Overseas Unguided Playtest Prep V1 — Final QA Report

Date: 2026-09-01

Branch: `codex/overseas-playtest-prep-v1`

Build identifier: `0.1.0-overseas-playtest-v1`

## 1. 修改摘要

本轮为已验收的中英文版本增加了一个与 gameplay 解耦的轻量试玩观测层：统一的强类型事件、匿名 tab session、Day run 标识、Day 1 教程/首单/结算 funnel、高价值烹饪事件、退出 checkpoint、可选 sink、隔离的 playtest/debug mode、JSON 导出以及可配置反馈链接。所有事件都从现有回调或前后状态差异中观察，不进入 reducer，不改变计时、随机数、存档或进度。

真实 QA 从空 `localStorage`/`sessionStorage` 开始，只通过可见 UI 完成了桌面 Day 1 三单并进入 Day 2，以及 844×390 触屏首单。没有使用 `playDay`、`qaScreen`、`qaServedOrders` 等状态捷径。

## 2. 修改文件

| 范围 | 文件 |
| --- | --- |
| Analytics | `src/analytics/events.ts`, `context.ts`, `tracker.ts`, `sinks.ts`, `gameplayObserver.ts` |
| Analytics tests | `src/analytics/events.test.ts`, `tracker.test.ts`, `gameplayObserver.test.ts`, `funnelIntegration.test.tsx`, `cookingIntegration.test.tsx` |
| Existing integration points | `src/main.tsx`, `src/App.tsx`, `src/components/LandscapeGame.tsx`, `src/components/game/KitchenScene.tsx` |
| Playtest UI | `src/components/playtest/PlaytestDebugPanel.tsx`, `PlaytestFeedbackLink.tsx`, corresponding tests, `src/styles/playtest.css` |
| Locale copy | `src/i18n/en.ts`, `src/i18n/zh-CN.ts`（仅新增可选反馈文案） |
| QA and documentation | `scripts/capture-overseas-playtest-prep-v1.mjs`, this report, five screenshots, `example-session.json`, `qa-results.json`, design and execution plan |

## 3. 完整 event schema

每条事件统一包含：`event_id`, `name`, ISO `timestamp`, session-relative `t`, `session_id`, optional `day_run_id`, optional `participant_id`, `locale`, `viewport_width`, `viewport_height`, `touch`, coarse `platform`, `playtest_mode`, `build_version`, `properties`。

| Event | Properties |
| --- | --- |
| `game_loaded` | `screen` |
| `session_started` | `screen` |
| `session_ended` | `screen`, optional `day`, optional `tutorial_step`, `orders_served`, `elapsed_ms`, `reason=pagehide` |
| `session_checkpoint` | 同上，`reason=hidden\|pagehide` |
| `home_viewed` | none |
| `start_game_clicked` | `day=1` |
| `continue_clicked` | `day` |
| `day_select_opened` | `source=home\|summary` |
| `settings_opened` | `source=home` |
| `day_started` | `day`, `guided_tutorial` |
| `tutorial_started` | `day=1` |
| `tutorial_step_viewed` | stable `step`, `elapsed_since_tutorial_start_ms` |
| `tutorial_step_completed` | stable `step`, `elapsed_since_tutorial_start_ms` |
| `tutorial_completed` | `elapsed_since_tutorial_start_ms` |
| `first_order_started` | `day`, stable `recipe_id` |
| `first_order_completed` | `day`, `recipe_id`, `duration_ms`, `mistakes`, `quality` |
| `ingredient_selected` | stable `ingredient_id`, optional `slot_id` |
| `ingredient_placed` | `ingredient_id`, `recipe_id`, stable `step_id`, `slot_id` |
| `gesture_completed` | `gesture_id=sauce\|cut\|roll`, `recipe_id`, `step_id`, `slot_id` |
| `dish_packed` | `recipe_id`, `slot_id` |
| `serve_attempted` | `recipe_id`, `slot_id`, anonymous in-run `customer_id` |
| `serve_succeeded` | `recipe_id`, `slot_id`, `customer_id`, `quality` |
| `serve_failed` | optional `recipe_id`, `slot_id`, `customer_id`, stable `reason` |
| `griddle_discarded` | optional `recipe_id`, `slot_id` |
| `help_opened` | `screen`, optional `day` |
| `pause_opened` | `day` |
| `order_timeout` | `day`, `recipe_id`, `customer_id` |
| `mistake_recorded` | `day`, stable `mistake_type`, optional `step_id`, optional `slot_id` |
| `repeated_mistake` | `day`, `mistake_type`, `count=3` |
| `day_completed` | `day`, session/day elapsed ms, orders, average quality, mistakes, stars, cash |
| `summary_viewed` | `day`, orders, average quality, mistakes, stars, cash |
| `play_again_clicked` | `day` |
| `next_day_clicked` | `from_day`, `next_day` |
| `back_to_day_select_clicked` | `from_day` |
| `feedback_clicked` | `day` |

Runtime validation rejects unknown event names, extra property keys, translated labels used as IDs, non-finite numbers, invalid enum values, malformed participant codes, and non-HTTP(S) URLs. Rejection and sink failure return silently and cannot throw into gameplay.

## 4. 每个事件的触发点

| Event(s) | Trigger |
| --- | --- |
| `game_loaded` | Analytics initializes once per document before React render. |
| `session_started` | First initialization of a tab-scoped session; reload does not duplicate it. |
| `session_checkpoint` | Document becomes hidden or receives `pagehide`, with a short lifecycle dedupe window. |
| `session_ended` | Best-effort non-persisted `pagehide`; not treated as an exact human exit. |
| `home_viewed` | Existing screen state enters Home. |
| `start_game_clicked` | Existing Start Game callback, immediately before starting Day 1. |
| `continue_clicked` | Existing Continue callback, immediately before starting the highest playable day. |
| `day_select_opened` | Existing Home day-select or Summary back-to-select action. |
| `settings_opened` | Existing Home Settings action. |
| `day_started` | Accepted `startDay` creates a fresh anonymous day run. |
| `tutorial_started` | Guided Day 1 session starts. |
| `tutorial_step_viewed` | Guided tutorial enters a stable step ID. |
| `tutorial_step_completed` | Pure previous/current kitchen-state comparison observes the step transition. |
| `tutorial_completed` | Existing guided tutorial transitions to complete. |
| `first_order_started` | First active customer/order appears in the day run. |
| `first_order_completed` | First successful delivery transition, with measured duration and quality. |
| `ingredient_selected` | Existing ingredient selection intent is accepted by the UI path. |
| `ingredient_placed` | State comparison observes a new accepted ingredient step on a griddle slot. |
| `gesture_completed` | State comparison observes an accepted sauce stroke, cut, or roll. No pointer moves are logged. |
| `dish_packed` | State comparison observes the existing ready-to-packed transition. |
| `serve_attempted` | Existing tray-to-customer attempt path. |
| `serve_succeeded` | State comparison observes a new delivery record. |
| `serve_failed` | Existing serve attempt returns a stable rejected outcome. |
| `griddle_discarded` | Existing discard control is used. |
| `help_opened` | Existing gameplay help control or shortcut opens help. |
| `pause_opened` | Existing pause control or shortcut opens pause. |
| `order_timeout` | State comparison observes an active customer time out. |
| `mistake_recorded` | Existing mistake count advances; category derives from the observed action/transition. |
| `repeated_mistake` | A closed mistake category reaches exactly three in one day run. |
| `day_completed` | Existing completion path computes the accepted final Summary values. |
| `summary_viewed` | Existing screen state enters Summary, once per day run. |
| `play_again_clicked` | Existing Summary Play Again callback. |
| `next_day_clicked` | Existing Summary next-day callback. |
| `back_to_day_select_clicked` | Existing final-day Summary callback returns to day selection. |
| `feedback_clicked` | Configured playtest-only feedback link is clicked. |

## 5. Playtest URL 格式

```text
/?lang=en&playtest=1
/?lang=en&playtest=1&pid=p07
/?lang=en&playtest=1&debug=1&pid=p07
```

`debug=1` without `playtest=1` is ignored. Ordinary URLs keep the accepted production UI and have no debug or feedback DOM.

## 6. Participant code 使用方式

`pid` is an optional research code, not a name. It is accepted only in playtest mode and only when it matches `[A-Za-z0-9_-]{1,32}` after trimming. Invalid values and every `pid` outside playtest mode are omitted. QA used `qa-desktop`, `qa-mobile`, and `qa-debug`; a shared link can instead assign random codes such as `p07`.

The implementation collects no name, email, phone, user-entered content, IP-derived value, GPS, exact address, full user-agent, login identifier, or fingerprint. Session and event IDs use browser cryptographic randomness where available.

## 7. Analytics sink 结构

- Console sink: development (except tests) or `playtest=1`.
- Session buffer: playtest mode only, capped at 1,000 events in `sessionStorage`; separate from campaign save.
- GA-compatible sink: calls only an already-present `window.gtag`; optional `VITE_GA_MEASUREMENT_ID` supplies `send_to`. No GA SDK or ID is bundled.
- Custom endpoint: optional validated `VITE_PLAYTEST_ANALYTICS_ENDPOINT`; asynchronous `fetch(..., keepalive: true)` and lifecycle `sendBeacon` fallback.
- Every sink runs independently in a microtask and catches synchronous/asynchronous failures. No sink response affects UI, reducer, timer, random generation, save, or progression.

## 8. Debug panel 使用方式

Open `/?lang=en&playtest=1&debug=1&pid=p07`. The lazy-loaded lower-right panel shows session prefix, participant code when present, locale, screen, day, tutorial step, event count, and build. `Hide/Show` collapses it and `Close` removes it for the document. The shell does not participate in layout and has no pointer events; only its controls are interactive.

## 9. Event export 使用方式

In the debug panel choose `Export Events`. The browser downloads `night-market-<build>-<session-prefix>.json` containing session metadata and the ordered session event array. The real desktop QA buffer is preserved unchanged at `docs/qa/screenshots/overseas-playtest-prep-v1/example-session.json`.

## 10. Feedback URL 配置方式

Set a build-time HTTP(S) value:

```powershell
$env:VITE_PLAYTEST_FEEDBACK_URL='https://example.test/form'
npm run build
```

The small localized Summary link appears only when both the URL is valid and `playtest=1` is present. Without configuration it is absent, as verified in both desktop and mobile QA. It is visually secondary to Next Day, opens with `noopener noreferrer`, and records `feedback_clicked`.

## 11. Desktop unguided QA — 1440×810

Result: PASS.

- Fresh storage; URL contained only `lang=en`, `playtest=1`, and anonymous QA `pid`.
- Start Game was the primary, obvious Home action.
- Customer actor and order bubble made arrival visible.
- Mouse completed Noodle Sheet → Egg → heat wait → Hot Dog → heat wait → Sauce ×2 → Scallions → Cut ×3 → Roll → Pack → Serve.
- All three Day 1 orders completed through the unchanged Summary; Play Again and Next · Big Eater Challenge remained distinct. Next Day opened Day 2.
- 82 ordered events; all 12 tutorial steps had viewed and completed evidence; first order duration was 10,927 ms; Day 1 completed at session `t=37,098 ms` with 3 orders, 0 mistakes, 3 stars, and cash 66.
- No console errors, page errors, horizontal overflow, or vertical overflow. Debug and feedback UI were absent.
- Dedicated debug URL showed the panel only in its expected lower-right location.

Evidence:

- `screenshots/overseas-playtest-prep-v1/playtest-home-1440x810.png`
- `screenshots/overseas-playtest-prep-v1/playtest-day1-tutorial-1440x810.png`
- `screenshots/overseas-playtest-prep-v1/playtest-summary-1440x810.png`
- `screenshots/overseas-playtest-prep-v1/playtest-debug-1440x810.png`

## 12. Mobile unguided QA — 844×390 touch

Result: PASS with one recorded non-blocking issue.

- Real Chromium touch input completed Start Game and the first order; all required ingredient taps, sauce strokes, cuts, roll, Pack, and Serve worked.
- Tutorial reached `complete`; 48 events included `first_order_completed`.
- Tap is available for ingredients, Pack, and Serve; dragging is not the only method for those actions, and no required information was hover-only.
- No console errors, page errors, horizontal overflow, vertical overflow, debug UI, or feedback UI.
- Safe-area/letterbox composition remained inside the 844×390 viewport.

Evidence: `screenshots/overseas-playtest-prep-v1/playtest-day1-mobile-844x390.png`.

## 13. 模拟 funnel 与 conversion 计算

Real QA ordered subsequence:

```text
Game Loaded (t=2)
↓ Start Clicked (t=1,330)
Day 1 Started (t=1,700)
↓ Tutorial Started (t=1,701)
First Order Completed (t=14,462)
↓ Tutorial Completed (t=14,463)
Day 1 Completed (t=37,098)
↓ Summary Viewed (t=37,224)
Next Day Clicked (t=38,965)
```

Production analysis should count distinct `session_id` (and scope day metrics by distinct `day_run_id`) for the same `build_version`:

| Metric | Formula |
| --- | --- |
| Start Conversion | sessions with `start_game_clicked` / sessions with `game_loaded` |
| First Order Completion | Day 1 runs with `first_order_completed` / Day 1 runs with `day_started` |
| Tutorial Completion | runs with `tutorial_completed` / runs with `tutorial_started` |
| Day 1 Completion | Day 1 runs with `day_completed` / Day 1 runs with `day_started` |
| Day 2 Intent | summaries with `next_day_clicked` / summaries with `summary_viewed` |
| Time to First Order | `first_order_completed.timestamp - first_order_started.timestamp`, or validated `duration_ms` |
| Tutorial drop-off | for each stable step, sessions with its `tutorial_step_completed` / sessions with its `tutorial_step_viewed`; the first material fall identifies the likely block |

`session_checkpoint` supplies the last known screen/day/tutorial step/orders served for abandonment analysis. `session_ended` must remain best-effort rather than a denominator requirement.

## 14. Build

- Command: `VITE_BUILD_VERSION=0.1.0-overseas-playtest-v1 npm run build`
- Result: PASS; TypeScript and Vite production build completed, 467 modules transformed.
- Shareable archive: `D:\game_demo\artifacts\night-market-overseas-playtest-v1.zip`
- Archive size: 25,649,570 bytes.
- SHA-256: `160FA2D7C9542FEEA22645D7647857F0F02F195C37951ABC045AA90C1741EF13`
- ZIP validation: 308 entries, including root `index.html` and 307 `assets/` entries.

## 15. Tests

- `npm test -- --run`: PASS — 67 files, 374 tests.
- `npm run validate:art`: PASS — 428 assets across 5 families.
- Real browser QA: PASS — desktop full Day 1 + Day 2 entry; mobile touch first order; 0 console/page errors and 0 viewport overflow.
- Event schema tests cover valid/invalid payloads and stable IDs.
- Tracker tests cover dedupe, sink throws, participant-code privacy, and session persistence.
- Integration tests cover funnel and cooking outcomes without reducer changes.
- Playtest tests cover ordinary/debug visibility, JSON export, and configured/unconfigured feedback.

## 16. Bundle/performance delta

Baseline: JS 380,986 bytes; CSS 89,024 bytes; 458 modules.

| Metric | Final | Delta |
| --- | ---: | ---: |
| Initial JS | 401,443 bytes | +20,457 bytes / +5.37% |
| Lazy debug JS | 2,288 bytes | loaded only for `playtest=1&debug=1` |
| All JS chunks | 403,731 bytes | +22,745 bytes / +5.97% vs baseline JS |
| CSS | 90,825 bytes | +1,801 bytes / +2.02% |
| Modules | 467 | +9 |

No analytics SDK was installed. The debug panel is a separate lazy chunk; ordinary first render does not request it. Analytics adds no required remote request, and interaction tracking is microtask-dispatched without awaiting a sink.

## 17. P0 blockers

None found. Desktop could complete Day 1 and enter Day 2; mobile touch could complete the first order. Analytics failure paths are isolated and tested.

## 18. 只记录、未修改的体验问题

| Severity | Observation | Decision |
| --- | --- | --- |
| P2 | English tutorial says “Tap or drag the noodle wrap” while the ingredient label says “Noodle Sheet”. This is a terminology mismatch, not a blocker. | Recorded only; frozen copy/UI was not changed. |
| P2 | At 844×390, the brief post-first-order/tutorial-completion message is partially behind the top HUD, reducing transient readability. Core controls remain available and the flow completes. | Recorded only; no tutorial/layout change in instrumentation round. |

No P0 issue required an exception to the frozen scope.

## 19. Character assets modified: NO

No character or customer image, atlas, animation, or rendering contract was modified.

## 20. Core visual system modified: NO

No accepted Home, Settings, Day Select, Gameplay, Summary, English surface, background, upgrade icon, or global visual token was redesigned. New CSS is isolated to `.playtest-*` test-only UI.

## 21. Gameplay balance modified: NO

No recipe, ingredient, customer generation, patience, economy, income, score, upgrade cost, target order, difficulty, tutorial state machine, timer, random behavior, or save schema was modified.

## 22. Campaign/progression modified: NO

`src/landscape/campaign.ts`, `src/landscape/progression.ts`, and `src/landscape/kitchen/reducer.ts` remain byte-identical to the accepted base commit `efde34d`.
