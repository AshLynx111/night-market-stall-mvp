# Task 6 report

Status: DONE (review fix)

Commit: pending final Task 6 fix commit

## TDD

- RED: derivative-asset and rack-geometry tests failed before the review fix: the live derivative was missing, the full clean background was still rendered over the reference, and the rack was a generic 3x5 grid.
- GREEN focused: `npm test -- --run src/styles/kitchenCompositionAsset.test.ts src/styles/kitchen-layout.test.ts src/components/game/KitchenScene.test.tsx`
- Full regression: `npm test -- --run` — 35 files passed, 227 tests passed.

## Implementation

- Built `kitchen-screen-live-clean.png`, a pixel-aligned 1672x941 derivative of `kitchen-screen-user-final.png`.
- An ImageGen edit supplied clean night-market content only for six localized person/order-bubble masks. The deterministic final composite preserves every approved source pixel outside those masks; the contract test measured zero changed pixels outside them.
- The derivative is the sole visible kitchen background. The former full-frame `night-market-clean-background.png` cover was removed.
- Preserved the approved 2x3 physical rack for the first six ingredients. Later unlocks switch to a bounded 3x5 overflow geometry without ingredient/griddle overlap.
- Live `CustomerLane` actors remain the only rendered people. Three explicit lane anchors and face-clearance state markers were added without changing horizontal customer motion.
- Existing cooking reducer, cooking wait times, ingredient drag/tap, two griddle rectangles, brush/cut/roll gestures, cumulative stage art, tray and delivery logic were preserved.

## Real Edge QA

- Viewport: 1440x810.
- Passing run: four checkpoints covering entry, three active customers, Day 1 complete-bin controls, both griddles with cumulative stage images, and leaving/timeout state.
- Original-detail inspection: no baked duplicate customers or sample bubbles, no bubble over a visible face, three live actors aligned to the counter, Day 1 controls grounded on the approved 2x3 iron-box rack, and both food stages contained within their griddles.
- Evidence (gitignored): `artifacts/task-6-kitchen-composition/01-entry.png`, `02-three-active-day1-bins.png`, `03-two-griddles-cooking-stages.png`, `04-leaving.png`, `result.json`.

## Build

- `npm run build`: passed; 416 modules transformed.

## Concerns

- The source plate remains intact as the art authority; only the localized derivative is shipped to live gameplay. The 2x3-to-3x5 layout change happens only after later days unlock more than six ingredient controls.
