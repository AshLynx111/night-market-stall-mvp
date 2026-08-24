# Gameplay UI Polish Final Acceptance Design

## Objective

Close the original gameplay UI/UX phase-one request with one current, reproducible acceptance run against the optimized production build. The acceptance layer must prove the requested desktop and mobile-landscape states, complete the real Day 1 guided order, exercise controls and persistence, and leave no listed system emoji in production source.

## Scope

This final phase does not add gameplay, change campaign progression, alter recipes, difficulty, order targets, income, upgrades, or saved-data shape. It performs only:

- cleanup of the remaining dormant `TopBar` music character;
- a production-build browser acceptance script;
- fresh 1440×810 and mobile-landscape screenshots covering the original visual checklist;
- machine-readable acceptance results and a final delivery report.

Existing approved PNG masters remain untouched. Runtime WebP assets, audio behavior, safe-area scaling, tap controls, keyboard controls, tutorial state, and gameplay reducers remain authoritative.

## Acceptance Architecture

`scripts/capture-gameplay-ui-polish-final.mjs` builds no fixtures into production code. It starts `vite preview` against the already-built `dist` for real home, cooking, campaign-selection, and mobile flows. A separate Vite development server is used only for the existing low-patience and summary query fixtures, which production deliberately ignores. Isolated browser contexts provide deterministic local storage, drive the UI with Playwright, capture screenshots, and write `qa-results.json`.

The run is divided into independent scenarios so waiting customers and timers in one scenario cannot contaminate another:

1. Cold home to Day 1 guided order: test music, pause, every cooking input, delivery feedback, tutorial persistence, and campaign coin persistence.
2. Day 3 production composition: seed valid settled Day 1–2 save data, enter Day 3 through the real selection screen, wait for two active customers, and place noodles on both left and right griddles before capturing.
3. Day 5 production composition: seed valid settled Day 1–4 save data, enter Day 5 through selection, and capture the expanded 3×5 rack with multiple customers.
4. Critical patience development fixture: use the existing `qaPatienceRatio` fixture and require the same critical-customer marker rendered by normal gameplay.
5. Day 1 summary development fixture: invoke the real next-day control and verify Day 2 plus persisted settled progress.
6. Mobile landscape: run at 844×390 with touch enabled, place food using tap, open pause, and require all critical surfaces to stay inside the viewport.

Every page records console errors and requires all visible images to decode successfully.

## Visual Evidence

Fresh evidence is written under `docs/qa/screenshots/gameplay-ui-polish-final/`:

- `day1-initial-1440x810.png`;
- `first-customer-1440x810.png`;
- `cooking-1440x810.png`;
- `delivery-feedback-1440x810.png`;
- `two-customers-1440x810.png`;
- `two-griddles-1440x810.png`;
- `expanded-rack-1440x810.png`;
- `low-patience-1440x810.png`;
- `mobile-landscape-844x390.png`.

The two-griddle capture is valid only when both `[data-slot-id="left"]` and `[data-slot-id="right"]` report a noodle stage. The mobile capture is valid only after a touch placement succeeds.

## Source Cleanup

The dormant legacy `TopBar` must stop rendering `♪`. It will reuse the established `GameIcon` sound API, preserving the component callback and accessible label. A source contract scans non-test TypeScript/TSX/CSS under `src` and rejects the original forbidden set: `😊`, `💵`, `☾`, `♪`, `Ⅱ`, `🔥`, and `🎵`.

## Verification Gates

Completion requires all of the following:

- forbidden production-source emoji count is zero;
- all nine screenshots exist at the declared viewport sizes;
- left and right griddles are simultaneously occupied in the corresponding scenario;
- at least two customers are simultaneously active;
- the critical patience marker appears;
- pause opens and closes;
- music toggles off and back on;
- the guided tutorial completes through noodle, egg, hot dog, sauce, scallion, three cuts, roll, pack, and delivery;
- delivery increments the order counter exactly once and persists earned coins;
- the summary's next-day action enters Day 2 and existing settled save data remains valid;
- mobile tap placement and pause work at 844×390 without viewport overflow;
- browser console error count is zero and all visible images decode;
- `npm test -- --run` passes;
- `npm run build` passes;
- the runtime WebP freshness/quality contract passes.

Chrome behavior is covered by Chromium/Edge production QA. Safari-facing compatibility is covered by standards-based CSS, safe-area environment variables, pointer/touch tests, and the existing TypeScript/layout contracts; no local WebKit binary is available in this workspace, so the final report must not claim a native Safari browser run.

## Git and Rollback

Work remains on `codex/gameplay-ui-polish-v6`; no merge or push is performed. The final acceptance design and implementation are separate commits. The untracked `output/` directory remains untouched.
