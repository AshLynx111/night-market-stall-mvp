# Mobile HUD Layout Final Fix Design

## Goal

Make the Poki small-landscape gameplay HUD look like the desktop logical HUD scaled uniformly with the complete 1440x810 scene at 640x360, 836x470, and 844x390.

## Scope

- Remove only the gameplay HUD counter-scaling inside `@media (max-height: 480px) and (orientation: landscape)`.
- Preserve `--scene-inverse-scale` and its valid use by Help and non-HUD overlays.
- Preserve `100svh`, settled viewport resizing, stationary HUD interaction feedback, touch duplicate suppression, Poki English defaults, and Summary overflow fixes.
- Do not change gameplay, geometry outside the HUD, lifecycle behavior, or desktop presentation.

## Chosen Design

The Day/Home, Orders, Coins, Pause, and Sound regions will inherit `.game-screen__logical` scaling without any inverse transform or inverse-scaled right offsets. The desktop logical coordinates remain the source of truth. Small-landscape overrides may adjust only logical HUD widths, gaps, fonts, or icon sizes if the unmodified logical layout does not satisfy the three target screenshots.

This is preferred over viewport-pixel positioning because logical coordinates remain resolution-independent. Merely replacing inverse scale with another counter-transform is rejected because it recreates the same proportional error.

## QA Contract

- A CSS source test rejects `--scene-inverse-scale` in small-landscape rules targeting `.gameplay-hud__day`, `.gameplay-hud__orders`, `.gameplay-hud__coins`, or `.gameplay-hud__control`.
- Poki production QA launches English gameplay at 640x360, 836x470, and 844x390.
- QA records viewport bounding rectangles for all five HUD regions.
- Day/Orders, Orders/Coins, Coins/Pause, and Pause/Sound must each have exactly zero intersection area. Orders and the active order bubble must also have zero intersection area.
- QA saves three real gameplay screenshots and assembles them into `mobile-hud-contact-sheet.png`.

## Acceptance Criteria

- All five HUD regions share the logical scene scale and remain visually proportional.
- No HUD pair overlaps, Orders remains visible, and Coins is not disproportionately large.
- The prior touch geometry, viewport stability, locale, Summary, and Poki lifecycle regressions remain green.
- The work is delivered as one pushed commit on `codex/poki-platform-build-v1` without merging `main`.
