# Gameplay UI Polish V5 Design

## Goal

Keep the complete 1440×810 kitchen scene visible and interactive inside landscape phone safe areas, including notches, rounded corners, home indicators, browser chrome changes, and device rotation, without changing logical gameplay geometry.

## Chosen approach

Add one safe viewport between `.game-screen` and `.game-screen__logical`. CSS positions this viewport inside four safe-area inset variables. A focused React hook measures the viewport and scales the existing fixed logical scene to fit its real width and height.

This preserves every existing coordinate, target, and asset. Only the outer fitting boundary changes.

Alternatives rejected:

- Applying padding directly to the fixed logical scene would move gameplay coordinates and break pointer conversion assumptions.
- Reading `env(safe-area-inset-*)` values in JavaScript through temporary probe elements would duplicate CSS ownership and be harder to test.
- Using only `window.innerWidth` and `window.innerHeight` cannot account for unequal left/right safe areas or dynamic Safari visual viewport changes.

## Safe viewport

- `.game-screen` defines `--game-safe-top`, `--game-safe-right`, `--game-safe-bottom`, and `--game-safe-left` from `env(safe-area-inset-*, 0px)`.
- `.game-screen__safe-viewport` is absolutely inset by those variables and centers the logical scene.
- The safe viewport clips any transformed overflow and never intercepts pointer events beyond the scene itself.
- The portrait rotate-device layer remains outside the safe viewport and pads its message by the same inset variables.
- Custom properties allow deterministic browser QA to simulate non-zero device insets.

## Scene fitting hook

- `fitGameplayScene(width, height)` returns `min(width / 1440, height / 810)` and falls back to `1` for non-positive dimensions.
- `useGameplayViewport()` returns `viewportRef`, `sceneScale`, and `sceneInverseScale`.
- On mount it measures the safe viewport using `getBoundingClientRect()`.
- A `ResizeObserver` tracks layout and safe-area changes.
- Window resize and `visualViewport.resize` are fallback signals for rotation and mobile browser chrome changes.
- All observers and listeners are removed on unmount.
- Repeated measurements that produce the same scale do not cause state churn.

## Layout integration

- `LandscapeGame` stops calculating scale from global window dimensions.
- The new safe viewport wraps only `.game-screen__logical`.
- The logical scene becomes a centered fixed-size child and scales around its center without translation-based positioning.
- `--scene-scale` and `--scene-inverse-scale` remain available to every existing HUD, tutorial, and kitchen rule.

## Error handling

- A missing or zero-sized viewport keeps the previous valid scale.
- Environments without `ResizeObserver` still update through window and visual viewport events.
- Environments without `visualViewport` use the window path only.

## Testing and QA

- Unit tests cover width-limited, height-limited, and invalid scale calculations.
- Hook tests cover initial measurement, ResizeObserver updates, visual viewport updates, and listener cleanup.
- CSS tests require all four safe-area variables and the safe viewport boundary.
- Browser QA uses a 667×375 landscape viewport with synthetic 44/44/8/21-pixel insets, verifies that the logical scene bounds stay inside the safe viewport, and captures gameplay plus pause-menu screenshots.
- Run the full Vitest suite and production build.

## Non-goals

- No portrait gameplay, coordinate changes, HUD redesign, recipe changes, browser-specific user-agent branches, dependency additions, or save changes.
