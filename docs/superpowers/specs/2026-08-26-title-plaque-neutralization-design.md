# English Title Plaque Neutralization Design

## Scope

Only four English title regions change: Home main title, Settings game-title plaque, Day Select title, and Summary `Day Complete` heading. The English ingredient label `Noodle Wrap` changes to `Noodle Sheet`. All gameplay geometry, characters, day cards, tutorial UI, order bubbles, summary data, upgrades, buttons, campaign, progression, and Chinese UI remain frozen.

## Problem

The four accepted English titles currently sit on opaque, regularly bounded wood DOM panels. Those panels cover the original ornamental plaques instead of behaving like text placed inside them. Removing the English glyphs would still leave obvious new rectangles.

## Considered Approaches

1. **Transparent title layer plus feathered neutral texture mask — selected.** Keep each DOM element only as a transparent positioning layer. Put a small, irregular, edge-feathered texture mask behind the glyph area with a pseudo-element, leaving the original frame, gold edge, ropes, ornaments, silhouette, highlights, and shadows visible.
2. **Four raster neutral patches.** This can match source texture closely but adds locale assets and requires maintaining viewport-aligned crops. It is unnecessary if CSS masks pass visual QA.
3. **Opaque clipped wood shapes.** Non-rectangular clipping removes square corners but still creates a visibly separate replacement board, so it does not meet the user's removal test.

## Selected Visual Treatment

- Title containers have no background, border, border radius, or box shadow.
- A `::before` pseudo-element covers only the baked Chinese glyph zone, not the complete plaque face.
- The pseudo-element uses layered warm-brown texture and an elliptical/polygonal mask with feathered opacity. No straight rectangular edge remains visible.
- English text remains above the pseudo-element and is aligned within the original plaque geometry.
- Home and Settings share the same neutralization treatment because their central sign geometry matches.
- Day Select uses the existing top wooden sign with a smaller mask behind its title/subtitle glyph zone.
- Summary uses the original hanging gold-edged title seat; the mask stays inside that seat and never covers its outline.
- Decorative Chinese night-market signage remains environmental art.

## Copy

Change only `ingredient.noodle` from `Noodle Wrap` to `Noodle Sheet`. Finished recipe names, tutorial instructions, step verbs, and cooked-product wording remain unchanged because the request targets the raw ingredient label shown in the bin.

## QA

- Add style contracts proving the four title containers are transparent and borderless, and that each uses a feathered `::before` neutral mask.
- Capture only Home, Settings, Day Select, and Summary in English at 1440×810.
- Manually review both the rendered title and the hypothetical text-off state. A page fails if the remaining mask reads as a newly overlaid rectangle.
- Run focused i18n/style tests plus the existing full suite and production build after visual approval.

## Frozen Boundaries

Character assets modified: NO

Gameplay logic modified: NO

Campaign/progression modified: NO
