# Gameplay UI Polish V3 Design

## Goal

Close the remaining keyboard, focus-management, and assistive-technology gaps without changing gameplay, economy, progression, or saved data.

## Chosen approach

Use one shared accessible dialog primitive and one narrowly scoped gameplay-shortcut hook. Existing modal contents and callbacks remain intact; the new utilities own only interaction mechanics. This avoids duplicated focus code while keeping the campaign screen and kitchen state machine unchanged.

Alternatives rejected:

- Adding ARIA attributes without focus behavior would leave keyboard users trapped behind modal overlays.
- Building a complete remappable input system would exceed the current UI/UX scope and require new settings and persistence.

## Accessible dialogs

- `AccessibleDialog` renders the modal backdrop and semantic dialog section.
- On mount it records the previously focused element and focuses the first enabled interactive control.
- Tab and Shift+Tab loop within the dialog.
- Escape calls the supplied close action.
- On unmount it restores focus when the original element is still connected.
- Menu, help, and abandonment confirmation use the same primitive.
- Dialog visuals and existing action copy remain unchanged.

## Gameplay shortcuts

- Escape opens the pause/menu surface when no dialog is open; inside a dialog it closes that dialog through the dialog primitive.
- `H` opens help and `M` toggles music during live gameplay.
- Shortcuts do nothing while an input, select, textarea, contenteditable element, or dialog owns the interaction.
- Buttons expose matching `aria-keyshortcuts` metadata.
- Shortcuts reuse existing pause and sound actions so state and sound behavior cannot diverge.

## Status semantics

- The HUD order counter becomes a progressbar with numeric minimum, maximum, and current values.
- Delivery and tutorial-completion status messages use atomic polite live regions.
- Repeated patience ticks and cooking heat ticks are not live-announced to avoid excessive speech.

## Error handling

- Missing focus targets fall back to focusing the dialog container.
- Focus restoration is skipped if the trigger was removed during navigation.
- Keyboard listeners are removed on unmount and never prevent default behavior outside their supported shortcuts.

## Testing and QA

- Unit tests cover dialog focus entry, forward/reverse wrapping, Escape, and restoration.
- Hook tests cover supported keys and editable/dialog suppression.
- Component tests cover progressbar and atomic status semantics.
- Browser QA uses only keyboard input to open/close help and pause, toggle music, and confirm focus restoration.
- Run the full Vitest suite and production build.

## Non-goals

- No key remapping screen, controller support, portrait gameplay, new dependencies, new save fields, or gameplay-rule changes.
