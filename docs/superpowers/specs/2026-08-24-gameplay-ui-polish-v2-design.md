# Gameplay UI Polish V2 Design

## Goal

Continue the gameplay UI/UX refactor without changing recipes, day targets, customer timing, economy, progression, or the campaign save format. This phase makes the illustrated menus and live kitchen feel like one product, improves dense-order scanning, and keeps critical text readable on short landscape screens.

## Chosen approach

Use a lightweight shared presentation layer over the approved raster plates. Existing screen markup, art coordinates, state transitions, and gameplay reducers remain authoritative. CSS classes and small reusable helpers provide motion, responsive scaling, icons, and UI sounds without introducing a new animation or audio dependency.

Alternatives rejected:

- Rebuilding the illustrated menus as DOM cards would improve flexibility but would discard accepted art alignment and greatly expand scope.
- Adding an animation library would offer more elaborate transitions but is unnecessary for a small set of deterministic fades, lifts, and pulses.

## Screen cohesion

- Home, settings, day select, gameplay, event, and summary roots share a `ui-screen` contract.
- Each mounted screen receives a short opacity/scale entrance that never delays interaction.
- Modals use the same backdrop fade and card lift timing.
- The existing approved art and invisible hotspot geometry remain unchanged.
- `prefers-reduced-motion: reduce` collapses all new animation and transition durations.

## UI sound feedback

- Reuse the current Web Audio sound generator; do not add audio assets.
- Navigation and modal actions use the existing tap cue.
- Starting a day or continuing to the next day uses the success cue.
- A successful upgrade uses the upgrade cue; an unaffordable or maxed upgrade uses the error cue.
- Music muting remains independent from effects volume.
- Audio failures remain optional and must never block an action.

## Order density

- `OrderBubble` derives density only from visual content: compact when a recipe has more than six displayed ingredients or has modifiers alongside at least six ingredients.
- Compact mode retains every ingredient occurrence and modifier; it only reduces gaps, tile size, and overall bubble padding.
- Accessible order text remains complete and unchanged.
- Patience hierarchy and critical-customer behavior remain unchanged.

## Short landscape readability

- At viewport heights of 480 px or less, the globally scaled 1440x810 kitchen remains the source of geometry.
- HUD groups, order bubbles, tutorial copy, delivery feedback, and the help control apply bounded inverse scaling around their own anchors.
- Right-side HUD offsets are compensated so sound, pause, and coin controls do not overlap.
- The rule is purely presentational and does not modify hit testing or gameplay coordinates.

## Icon consistency

- Add a lock symbol to the existing inline SVG icon set.
- Remove the remaining lock emoji from the day-select presentation.
- Do not change text stars because they are typographic rating characters, not platform emoji.

## Testing and QA

- Component tests cover compact order density and the lock icon.
- App tests cover shared screen classes and UI sound routing.
- CSS contract tests cover short-landscape inverse scaling and reduced-motion behavior.
- Browser QA captures home, select, summary, dense orders, and 844x390 landscape gameplay with zero console errors.
- Run the full Vitest suite and `npm run build` before delivery.

## Non-goals

- No recipe, patience, cooking, reward, star, unlock, or upgrade-value changes.
- No new art generation, dependencies, save migration, portrait gameplay, or localization work.
- No replacement of approved background plates.
