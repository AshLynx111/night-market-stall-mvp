# Summary Upgrade Icon Skeuomorphism Design

## Goal

Redraw the summary upgrade row's existing flat SVG family as three cohesive miniature 2.5D ornaments that belong inside the warm wooden UI, without changing card layout, text, pricing, levels, disabled states, interaction, persistence, or progression.

## Approved Semantics

- `funds`: a tied money pouch with one overlapping bronze coin.
- `fire`: a compact charcoal stove badge with a visible warm furnace opening and a small flame.
- `sign`: a miniature wooden hanging signboard, replacing the lantern silhouette.

## Shared Visual System

All variants retain the same 48×48 SVG coordinate system and the same rendered dimensions. They use:

- a slight front-facing view with a shallow top plane;
- one upper-left warm highlight and one lower-right shade;
- `2.6px` rounded warm-brown outlines;
- layered warm gradients rather than photographic texture;
- a translucent internal lower shade that reads as a light inner shadow;
- a shared subtle `0 3px 1px` bottom drop shadow;
- a common baseline, comparable silhouette area, and matching detail density.

The result should feel like three small enamelled or carved ornaments inset into the wooden cards. Highlights stay narrow and controlled; there is no outer glow, glossy sticker rim, emoji, raster art, or high-detail illustration.

## SVG Architecture

`UpgradeCardIcon` continues to own all three icons. Each instance defines three variant-specific gradients with IDs namespaced by the variant:

- body gradient: warm upper-left face to darker lower-right face;
- accent gradient: pale gold/orange highlight to deeper bronze/red;
- inset gradient: transparent upper area to a low-opacity dark lower edge.

Each drawing uses the same semantic layer classes:

- `upgrade-card-icon__body` for the primary volume;
- `upgrade-card-icon__accent` for coin, furnace glow, or sign trim;
- `upgrade-card-icon__shade` for the internal bottom shadow;
- `upgrade-card-icon__highlight` for the upper-left reflected edge;
- `upgrade-card-icon__detail` for restrained functional marks.

CSS supplies the shared outline, shadow, and material variables. SVG geometry supplies the semantic silhouette. No component interface or `UpgradeShop` markup changes are required.

## Variant Geometry

### Funds

The bag occupies the central lower area, with a folded tied neck and a slightly asymmetric body. A bronze coin overlaps the lower-right edge, using a thick rim and square coin hole. The left shoulder receives the highlight and the bag's lower-right curve carries the inset shade.

### Fire

The stove uses a squat trapezoidal body on two short feet, a raised top rim, and a recessed furnace opening. A compact flame emerges from the opening, while three small lower vents communicate heat equipment rather than a standalone flame sticker.

### Sign

Two short hanging loops support a thick wooden plaque. A narrow top/left highlight and lower/right shade establish the same view as the other ornaments. Two restrained central wood marks suggest a sign face without adding text that would become illegible at small sizes.

## Scope Boundaries

- Keep `UpgradeCardIconKind`, DOM ordering, accessible decoration semantics, icon wells, card coordinates, and SVG size unchanged.
- Change only `UpgradeCardIcon.tsx`, its visual CSS rules, and their tests.
- Do not alter `UpgradeShop`, campaign data, purchase handlers, storage, or the select-screen appearance.
- Add no dependency, raster asset, external icon package, animation, or new interaction.

## Verification

- Component tests require all three icons to use a 48×48 view box, `2.6px` outline, shared layer classes, namespaced gradients, and no raster/emoji nodes.
- CSS tests require the same outline color, drop shadow, and material-layer selectors for all variants.
- Existing App and upgrade tests must continue passing without modification.
- Production build and the full Vitest suite must pass.
- Complete three real Day 1 orders in Edge and capture a 1440×810 summary screenshot.
- Compare against `docs/qa/screenshots/summary-upgrade-icons-v1/summary-upgrade-icons-1440x810.png`; accept only if the card bounds remain unchanged, each icon remains the same rendered size, and the new forms read as one 2.5D set with no flat-sticker or independent-raster appearance.
