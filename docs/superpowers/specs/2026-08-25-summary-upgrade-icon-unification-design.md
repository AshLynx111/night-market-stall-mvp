# Summary Upgrade Icon Unification Design

## Goal

Remove the pasted-on illustration effect from the three summary upgrade cards while preserving the current summary layout, card geometry, copy, prices, levels, click targets, save behavior, and Day retention flow.

## Scope

The change applies only to the summary screen presentation of:

- current funds;
- fire upgrade;
- sign upgrade.

The level-select version of `UpgradeShop`, campaign progression, purchasing rules, storage schema, and summary structure remain unchanged.

## Visual Approach

Add a dedicated `UpgradeCardIcon` inline-SVG component with `funds`, `fire`, and `sign` variants. All three variants use the same 48×48 coordinate system, `2px` warm-brown outlines, rounded joins and caps, flat warm fills, and one shared CSS drop shadow. The drawings stay deliberately simple:

- funds: tied cloth money pouch with one coin mark;
- fire: single outer flame with one inner flame, no gradients or sticker-like glow;
- sign: compact hanging lantern with three horizontal ribs.

On the summary screen, each SVG sits inside a wood-colored icon well positioned over the baked high-detail illustration. The well uses the same brown as the existing dynamic wood masks and a soft edge shadow only large enough to conceal the original art. All icon wells share the same visual footprint and SVG size so no symbol dominates the row.

## Component and Styling Boundaries

- Create `src/components/game/UpgradeCardIcon.tsx` for the three related SVG variants.
- Update only `UpgradeShop` markup in `src/components/LandscapeGame.tsx` to render the funds icon and replace the two generic `GameIcon` instances.
- Add summary-scoped icon-well rules in `src/landscape.css`; the existing select-screen presentation stays hidden and unchanged.
- Do not add raster assets, emoji, gradients, external icon libraries, dependencies, or data fields.

## Accessibility and Behavior

Icons remain decorative with `aria-hidden="true"`. Existing section labels, button labels, disabled states, purchase handlers, prices, and keyboard/touch targets remain the accessible interface. The icon overlay must not intercept pointer events.

## Verification

- Component tests assert all three variants share the same view box, outline attributes, decorative semantics, and use only SVG geometry.
- App tests assert the summary contains exactly one icon of each type and that the upgrade button labels and purchase behavior remain intact.
- CSS contract tests assert the summary shows a common icon-well system while the select screen continues hiding these icons.
- Run the full Vitest suite and production build.
- Capture a production 1440×810 summary screenshot and compare it with `docs/qa/screenshots/day-retention-loop-v1/summary-next-day-1440x810.png`.
- Visual acceptance: no high-detail raster money bag, flame, or lantern remains visible; the three replacements have matching outline weight, warm-brown outlines, equal shadow strength, comparable size, and one flat hand-drawn style.
