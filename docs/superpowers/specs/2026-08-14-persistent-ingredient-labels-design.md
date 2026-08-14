# Persistent Ingredient Labels Design

## Goal

Match the approved Day 5 kitchen reference by keeping every unlocked ingredient visually large inside its physical steel well and showing a permanent Chinese nameplate on that well.

## Runtime composition

- The kitchen background owns the steel wells and counter perspective.
- Each unlocked ingredient remains a live button positioned by the canonical rack geometry.
- Food-only transparent art stays clipped to the well interior.
- A separate nameplate is rendered at the lower edge of the same button; it never moves with the drag ghost.
- Day 1 uses the existing 2×3 rack. Days 2–6 use the existing physical 3×5 rack.

## Labels and unlock order

The row-major order is: 面皮、鸡蛋、热狗、刷酱、葱花、香菜、洋葱、辣椒粉、火鸡面、芝士、玉米粒、奥尔良鸡排、培根、里脊肉、金针菇. The existing unlock-day mapping remains authoritative, so later wells stay empty until their ingredient unlocks.

## Visual rules

- Nameplates use a dark warm-brown fill, gold border, and warm ivory text.
- Food is enlarged inside each well without crossing the inner mask.
- Long names use a smaller font but remain on one line.
- Disabled tutorial ingredients retain readable labels while the food and control receive the existing disabled treatment.

## Interaction and accessibility

The button remains the only interactive element. Labels are decorative and pointer-transparent. Dragging moves only the food ghost; labels remain attached to the rack. Existing pointer, keyboard, sauce, tutorial, and dual-griddle behavior is unchanged.

## Acceptance

- Day 1 shows five labeled ingredients in the 2×3 rack.
- Day 2/3/4/5 show exactly 8/11/13/15 labeled ingredients in the 3×5 rack.
- Every label matches its ingredient ID and is always visible.
- Food, labels, and controls stay inside their physical wells at 1440×810.
- Existing cooking and delivery tests remain green.
