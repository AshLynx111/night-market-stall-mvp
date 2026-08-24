# Gameplay UI Polish V4 Design

## Goal

Make the complete cooking and delivery loop comfortable on phones and touchscreens by supporting both tap and drag, without changing recipes, scoring, economy, progression, or saved data.

## Chosen approach

Use a dual-mode interaction contract:

- Tap an ingredient to apply it to the first currently eligible griddle.
- Drag an ingredient to choose a specific griddle.
- Tap a packed dish to deliver it to the active customer whose order ID matches.
- Drag a packed dish to choose the matching customer directly.

Tap reuses the existing keyboard-placement and delivery rules, so it cannot bypass recipe order or customer state checks. Drag keeps the existing spatial control for players who prefer it.

Alternatives rejected:

- Replacing drag with tap would remove precise two-griddle control.
- Adding a separate mobile-only control layer would duplicate logic and produce inconsistent behavior across hybrid devices.
- Enlarging every target enough to solve the issue visually would crowd the short-landscape layout without fixing accidental drags.

## Pointer intent

- Mouse and pen begin dragging after 4 CSS pixels of movement.
- Touch begins dragging after 10 CSS pixels, allowing normal finger wobble to remain a tap.
- A stationary pointer release performs the tap action.
- The following browser-generated click is ignored for pointer input so one gesture cannot apply an ingredient twice.
- Programmatic and assistive clicks remain supported.
- Pointer cancellation only removes the drag preview and never performs an action.

## Ingredient behavior

- Noodle, egg, hot dog, bacon, enoki, scallion, and cheese taps reuse the current automatic eligible-slot resolver.
- Sauce taps select/apply the sauce tool exactly as before; sauce is never dropped as a normal ingredient.
- Invalid or premature taps remain no-ops under the existing reducer and eligibility rules.
- Accessible labels explain both tap and drag paths.

## Delivery behavior

- A tray tap looks up an active customer with the same order ID and dispatches the existing delivery action.
- Entering, leaving, missing, and mismatched customers are not valid tap targets.
- Drag delivery continues to use the physical customer drop target and the same active-order checks.

## Guidance and feedback

- Tutorial step copy names tap first and drag second while preserving the existing animated gesture path.
- The help panel explains automatic tap placement and precise drag placement in one short sentence.
- Existing pressed, ghost, success, error, and audio feedback remain the visual and auditory response system.

## Testing and QA

- Unit tests cover pointer thresholds for mouse, pen, and touch.
- Kitchen tests cover tap placement, touch wobble tolerance, pointer cancellation, click de-duplication, and tap delivery.
- Existing drag and keyboard tests remain required to pass.
- Browser QA completes the guided first order in a short-landscape mobile viewport using taps for ingredients and delivery.
- Run the full Vitest suite and production build.

## Non-goals

- No portrait gameplay, gesture remapping, haptics setting, recipe changes, target auto-correction beyond current eligibility, new dependencies, or save migration.
