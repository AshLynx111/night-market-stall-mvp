# Gameplay HUD Touch Geometry Design

## Goal

Keep the Day/Home, Pause, and Sound buttons at exactly the same geometric position through normal, hover, active, focus, pressed, and released states on Poki Mobile and iOS Safari, while retaining non-positional desktop hover feedback.

## Scope

- Modify only the gameplay HUD button interaction styling in `src/landscape.css`.
- Preserve the static `translateX(-50%)` used by `.gameplay-hud__orders` for layout.
- Do not change viewport scaling, `100svh`, gameplay geometry, HUD dimensions, `touchSafeAction`, Poki lifecycle behavior, or UI structure.

## Chosen Approach

Set `transform: none` on the base HUD button rule and repeat that invariant in the hover and active rules. Restrict hover feedback to `(hover: hover) and (pointer: fine)` so touch devices do not retain sticky hover styling. Use brightness/saturation for hover and brightness plus inset shadow for active feedback.

This is preferred over merely deleting the two translations because the explicit invariant protects the HUD from broader transform rules. A touch-only override was rejected because the geometry requirement applies equally to desktop hover and focus states. Scale, top, and margin feedback are prohibited because they also change button geometry.

## Regression Coverage

- A CSS contract test verifies the base, hover, and active HUD button declarations contain no positional transform and that hover is fine-pointer-only.
- Poki production browser QA records the `top` and `left` coordinates of each HUD control before touch, while pressed, and after release. Every coordinate must match exactly.
- Existing exact-once touch behavior, viewport stability, locale, Summary containment, builds, and full test suites remain green.

## Acceptance Criteria

- Day/Home, Pause, and Sound do not move on normal, hover, active, focus, press, or release.
- Desktop mouse hover still has brightness/saturation feedback.
- No interactive `transform`, `translate`, `scale`, `top`, or `margin` adjustment targets `.gameplay-hud button`, `.gameplay-hud__day`, or `.gameplay-hud__control`.
- `.gameplay-hud__orders { transform: translateX(-50%); }` remains unchanged.
