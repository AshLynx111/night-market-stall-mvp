# Gameplay UI Polish V1 Design

## Objective

Raise the playable kitchen screen from MVP presentation to a cohesive hand-drawn night-market game interface. Day 1 should immediately focus attention on the customer, the visual order, and the griddle. Campaign rules, order counts, scoring, economy, persistence, tutorial state transitions, gestures, and cooking coordinates remain unchanged.

All visible gameplay copy remains Chinese. English words in the product brief describe information structure only.

## Scope

This phase changes only the gameplay screen and its basic visual interaction feedback:

- compact gameplay HUD;
- ingredient-based order bubbles;
- customer patience presentation;
- griddle-stage clarity and short cooking feedback;
- ingredient-bin interaction states;
- concise tutorial overlay;
- unified SVG/CSS gameplay icons;
- gameplay UI tests and desktop/mobile-landscape QA evidence.

The home screen, day selection, summary screen, campaign progression, recipes, difficulty, order counts, income values, upgrades, advertising, analytics, localization, and saved-game schema are out of scope.

## Visual Direction

The interface keeps the existing warm illustrated night-market scene, metal ingredient bins, paper order bubbles, wooden signs, and amber highlights. It does not introduce SaaS cards, glassmorphism, neon technology styling, Material Design, or system emoji.

Small control icons use a single reusable inline-SVG wrapper. They are intentionally simple placeholders with rounded, slightly irregular strokes so approved hand-drawn assets can replace them later without changing component APIs.

## Background and Composition

The current live kitchen PNGs contain the old oversized HUD artwork. A compact runtime HUD cannot coexist with those baked signs, so the gameplay background changes as follows:

- the 2×3 rack uses the approved `night-market-clean-background.png`, which preserves the same kitchen geometry without the baked HUD;
- a deterministic, repository-owned 3×5 clean background is assembled from the approved clean background upper scene and the approved expanded-rack lower kitchen. It contains no generated art and preserves the current expanded rack geometry;
- the 1440×810 logical coordinate system, rack polygons, griddle hitboxes, tray, customer lanes, and gesture targets remain unchanged.

The runtime layer order is: clean illustrated background, customers and order bubbles, counter foreground, griddle/ingredients/tray, gesture and tutorial cues, non-blocking feedback, HUD and modals.

## Gameplay HUD

`GameplayHud` replaces the in-file `TopHud`. It is a compact single row near the top edge:

- left: `第 1 天`;
- center: `订单 2/5` with a thin progress mark;
- right: coin icon and `¥36`, pause icon, sound-on/sound-off icon.

Satisfaction is removed from the persistent HUD. The HUD remains visually subordinate to the customers and griddle, uses wood/paper colors, and exposes Chinese accessible labels. Pause and sound controls provide normal, hover, active, focus-visible, and disabled styling with at least a 44×44 logical touch target.

## Order Bubbles and Customer Status

`OrderBubble` continues to use `layoutOrderBubbles`; it does not change lane assignment or queue behavior. Each active customer receives one bubble whose tail points toward that customer and whose face clearance remains covered by the existing layout contract.

The recipe is represented primarily by ordered ingredient thumbnails derived from the existing recipe steps and approved ingredient assets. Repeated ingredients are repeated visually. Cut, roll, and pack are cooking operations and are not shown as ordered ingredients. Modifiers keep the existing extra/without/heat semantics and use SVG/CSS marks rather than emoji. Full recipe and modifier wording remains in the bubble's accessible name.

The patience bar becomes thicker and changes from green through amber to red. Customer emotion art remains driven by the existing patience/state logic. The lowest-patience customer receives a restrained pulse on the bar/bubble edge only; the page never flashes or shakes.

## Griddle and Cooking Feedback

The griddle's layout and hitboxes remain fixed. Stage art may scale slightly within the existing slot so noodle sheets, egg, sauce, cuts, rolled food, and packed food read more clearly.

`CookingFeedback` observes state transitions and renders short, input-transparent cues:

- noodle placement: quick drop-and-settle bounce;
- egg: brief spread highlight;
- correct heat: small warm readiness glint;
- sauce: clearer stroke trail and surface sheen;
- each valid cut: persistent cut mark plus a local impact nudge on that slot;
- roll: fast horizontal curl transition;
- pack/move to tray: completion pop and warm outline;
- successful serving: `+¥XX` and `完美 / 很好 / 可以` for 0.6–1.2 seconds, mapped from the existing delivery quality and income calculation.

No feedback changes reducer rules or blocks input. Reduced-motion mode replaces movement with immediate opacity/color changes.

## Ingredient Rack

`TableIngredient` keeps the existing 2×3 and 3×5 geometry. Food remains clipped inside its physical metal bin. Labels stay visible but become secondary to imagery.

Each ingredient supports normal, hover, active/pressed, focus-visible, selected, tutorial-highlighted, and disabled states. Tutorial highlighting applies only to the expected ingredient. Disabled bins are desaturated and lowered in contrast without becoming invisible.

## Tutorial Presentation

The tutorial reducer and state machine remain unchanged. `TutorialOverlay` consumes the existing tutorial step and instruction helpers.

Large numbered headings are removed. Each step uses one short Chinese instruction plus the existing path/hand cue and target highlight. The system hand emoji and cooking emoji are replaced with SVG/CSS cues. Accessibility status text remains available. The tutorial completion toast stays short and non-blocking.

## Component Boundaries

New focused components:

- `GameIcon`: the unified inline-SVG icon API;
- `GameplayHud`: compact day/order/coin/control HUD;
- `OrderBubble`: visual ingredients, modifiers, and patience;
- `CookingFeedback`: short visual transition and delivery feedback layer;
- `TutorialOverlay`: concise instruction and gesture/hand presentation.

`CustomerLane` retains customer pose and delegates its bubble. `KitchenScene` remains the integration point for kitchen interaction. `LandscapeGame` keeps screen, campaign, persistence, audio, and modal ownership, but delegates gameplay HUD and delivery feedback rendering.

## State and Data Flow

Existing kitchen state and actions remain authoritative. Presentation components receive derived props and emit the same existing callbacks.

Delivery feedback uses the newly appended `DeliveryRecord` already observed by `KitchenDaySession`; income is computed with the existing `incomeForDelivery` function and quality labels are presentation-only. Cooking feedback compares previous and current slot presentation state locally and does not dispatch new gameplay actions.

## Compatibility and Accessibility

- Chrome desktop, Edge desktop, Safari, iPhone landscape, and Android landscape use the existing scaled 1440×810 logical scene.
- Reference viewports are 1440×810 and 844×390.
- Portrait continues to show the rotate-device screen.
- All buttons have explicit non-browser-default states and adequate touch targets.
- Icon-only controls have Chinese accessible names.
- Ingredient names and full order descriptions remain available to assistive technology.
- `prefers-reduced-motion` is respected.

## Verification

Automated verification covers:

- no forbidden gameplay emoji in rendered gameplay components or gameplay CSS;
- compact HUD content and controls;
- visual ingredient order contents and accessible order wording;
- patience severity and critical-customer marker;
- tutorial short-copy rendering and SVG/CSS gesture cue;
- feedback labels and dismissal behavior;
- existing kitchen reducer, gesture, queue, geometry, storage, audio, campaign, and progression suites;
- TypeScript/build through the repository's existing `npm run build` script.

Visual QA captures at 1440×810:

- Day 1 initial state;
- first customer;
- food in progress;
- two simultaneous customers;
- two active griddles;
- a later day with the expanded ingredient rack;
- completed-order reward/quality feedback;
- low-patience customer.

At least one representative gameplay state is also captured at 844×390. QA uses development-only fixtures or deterministic browser interaction and does not change production progression or persistence.

## Git and Rollback

Work is isolated on `codex/gameplay-ui-polish-v1`. Design, HUD/order presentation, interaction feedback/tutorial, and regression/QA work are committed separately. Existing untracked user files are not added. The branch is not merged into `main` and no destructive push is performed.
