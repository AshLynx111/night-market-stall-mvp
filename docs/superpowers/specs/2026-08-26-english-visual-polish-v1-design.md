# English Visual Polish V1 Design

## Objective

Make the English locale of `Night Market: Street Food Stall` feel native to the existing warm, 2.5D night-market art direction instead of appearing as flat English text pasted over Chinese artwork. Preserve the approved Chinese presentation, frozen character art, gameplay geometry, campaign, progression, economy, and game logic.

## Frozen Boundaries

- Work on `codex/english-visual-polish-v1`, based on commit `c9be700`.
- Do not modify character images, character components, character position, size, color, expression, or animation.
- Do not modify recipes, customer generation, orders, scoring, tutorial state, saves, timing, day difficulty, progression, economy, or upgrade values.
- Do not regenerate or replace the complete home, settings, day-select, gameplay, summary, menu, or event artwork.
- Do not overwrite approved source art.
- Do not introduce new game content, analytics, advertising, platform integration, SEO work, or monetization.
- Keep Chinese presentation as the regression baseline. Shared changes are allowed only for an objectively broken cross-locale surface.

## Existing Baked-Text Audit

| Page or region | Baked Chinese text | Current English handling | Approved treatment |
| --- | --- | --- | --- |
| Home title sign | Large game title inside the central wooden sign | Chinese title remains visible because it is part of the background art | Add one English-only inner-sign surface that covers only the sign face, preserves its existing frame, and renders `Night Market` with `Street Food Stall` as a smaller line. Use layered wood gradients and feathered edges; use a small neutral WebP patch only if CSS cannot hide glyph edges. |
| Home main and secondary buttons | Start, continue, settings, menu, and achievement labels baked into five boards | Text-local solid-color label and glow placed over the artwork | Replace the text-local fill with an English-only full button-face treatment using wood depth, warm highlight, gold edge, short shadow, and consistent pressed/hover states. Preserve button boxes and hit targets. |
| Home decorative signs | Vertical shop signs, lanterns, and chalkboard copy | Remain part of the night-market scene | Keep as environmental art. They are not interactive UI and replacing them would exceed the local-patch constraint. |
| Settings title | Chinese title baked into the central paper panel | Solid English label covers the title area | Render an English-only wood/paper title plaque that uses the existing panel geometry and warm lighting. |
| Settings row labels | Three Chinese labels baked beside the sliders | Small solid patches with English labels | Convert each label region into a small warm paper label with subtle grain, brown edge, and soft shadow. Do not move sliders. |
| Settings return button | Chinese return label baked into the button | English text-local patch | Treat the complete inner button face as a matching warm button surface and preserve its hit target. |
| Day-select header | Chinese heading and subtitle baked into the top sign | One large English wood panel | Keep the existing sign frame but rebuild only its inner face with layered wood texture, warm highlight, and two-level English typography. |
| Day cards | Day heading, story, goal, and lock copy baked into six paper cards | Large English paper rectangle covers most of each card | Use an inset paper surface that follows the card interior, retains visible card frame and stars, and uses grain plus uneven warm tonal layers so it reads as the card face rather than a white overlay. |
| Day-select back/menu controls | Chinese labels baked in their boards | English text-local patches | Apply the same complete button-face wood/paper treatment used by comparable controls. |
| Day-select upgrade row | Chinese labels baked into the upgrade boards | Dynamic DOM copy over dark solid masks | Keep the approved icons and layout; add English-only textured wood wells behind the complete copy regions and verify wrapping/alignment. |
| Gameplay background | Decorative Chinese stall signage | No English cover | Keep as environmental art. Gameplay UI is already DOM-based and only its paper material needs alignment. |
| Tutorial hint and drop hint | No baked functional copy | DOM panels, currently brighter and flatter than the scene | Apply the lightweight warm paper-note material without changing placement or tutorial behavior. |
| Order bubbles | No baked functional copy | DOM panels | Preserve high contrast while adding warm cream, subtle grain, a thin brown edge, and a small soft shadow. |
| HUD and ingredient labels | No baked functional copy | DOM surfaces and chips | Keep layout and geometry; only normalize English typography and paper/wood material where needed. |
| Summary heading | Chinese heading baked into the hanging top plaque | English solid surface covers the title | Rebuild the English-only inner plaque face with wood grain, warm highlight, and display typography while preserving the frame. |
| Summary title, message, stats, and actions | Chinese labels or copy baked into the result board and buttons | Multiple solid paper/orange masks and DOM text | Convert complete inner regions to the shared paper/wood surfaces. Preserve all card positions, approved upgrade icons, and button hit targets. |
| Menu board | Chinese menu title and recipe text baked into the large menu image | English uses the existing localized DOM paper panel | Retain the localized panel structure and apply the same inset paper material and typography rules; do not rebuild menu art or recipe imagery. |
| Day 5 event | Scene art and character image; functional text is DOM | Existing dialogue paper panel | Keep scene and character untouched. Only align the dialogue surface with the Paper UI System if its current material diverges. |

## Chosen Implementation Strategy

Use a hybrid that prioritizes existing DOM structure and locale-scoped CSS:

1. **Textured DOM surfaces as the default.** Existing `data-locale-art-text`, `ui-text-surface`, `paper-panel`, `ui-text-chip`, `hint-panel`, and `stat-card` elements remain the primary rendering mechanism. Their English-only surfaces expand to the full intended sign, card, or button face instead of surrounding only the glyphs.
2. **CSS locale-neutral patches where the art frame already exists.** Layered linear and radial gradients, subtle repeating grain, inset highlights, warm borders, and short shadows reproduce wood or paper without adding a second UI framework.
3. **Small raster patches only as a verified fallback.** If visual QA still exposes Chinese glyph edges in the home title, settings, day cards, or summary heading, add tightly cropped WebP patches under `src/assets/runtime/locale/en/`. These load only inside English-only DOM branches or English-only CSS selectors and never replace approved source art.

Large raster patch sets and full DOM reconstructions are rejected because they increase seams, payload, and layout drift. Whole-screen art regeneration is prohibited.

## Paper UI System

The shared paper treatment uses warm cream and aged-paper gradients, a thin dark warm-brown edge, a soft yellow top-left highlight, and a short warm bottom shadow. Grain is subtle and CSS-generated so gameplay text stays sharp. Pure white, cold-gray borders, blue-gray shadows, glass blur, and generic Material-style cards are prohibited.

`hint-panel`, `order-bubble-panel`, `stat-card`, menu copy, and event dialogue may share base tokens but keep different depth:

- Tutorial hint: lightest depth and lowest visual weight.
- Order bubble: highest readability, thin edge, small shadow.
- Stat card: between paper and a shallow wooden inset.
- Menu/event panels: broad paper area with restrained grain.

## Wood UI System

English title signs, button faces, and upgrade-copy wells use layered warm-brown gradients, a restrained grain pattern, a gold or amber inner highlight, a darker lower edge, and a compact shadow. Hover raises warm highlight and focus visibility without introducing a flat translucent rectangle. Active state shortens the bottom shadow and shifts content slightly to preserve the approved pressed feeling.

## English Typography

Define two English-only roles without remote font downloads:

- Display: `Palatino Linotype`, `Book Antiqua`, Palatino, Georgia, serif for the home title, day titles, and summary headings.
- UI: `Trebuchet MS`, `Segoe UI`, Arial, sans-serif for buttons, descriptions, HUD, hints, stats, labels, and accessibility-adjacent visible copy.

Do not introduce page-specific font stacks. Keep visible English at 10px or larger at the 1440×810 reference viewport. Prefer shortening copy over using more than three lines or shrinking below the threshold.

## Component and File Boundaries

- `src/components/LandscapeGame.tsx`: add only semantic English surface wrappers or title line structure that CSS cannot express from the existing DOM. Do not change callbacks, state, campaign data, or screen geometry.
- `src/landscape.css`: contain English-only visual integration, shared Paper/Wood tokens, typography roles, responsive adjustments, and interaction states.
- `src/i18n/en.ts`: shorten only copy that fails visual length QA; retain approved terminology and metadata.
- `src/styles/englishVisualPolish.test.ts`: enforce English surface scoping, frozen character/gameplay boundaries, typography roles, and prohibited flat-white/flat-mask regressions.
- `scripts/capture-english-visual-polish-v1.mjs`: capture the specified English and Chinese regression states and emit diagnostics plus pasted-overlay ratings.
- `docs/qa/screenshots/english-visual-polish-v1/`: store the screenshots, contact sheets, and structured QA results.
- `docs/qa/english-visual-polish-v1.md`: record the baked-text audit outcome, risk ratings, regression result, asset bytes, build/tests, and frozen-boundary declarations.

No character, campaign, progression, reducer, service, queue, economy, or asset-source file belongs in the implementation diff.

## Rendering and Loading Behavior

Locale-specific surfaces are enabled by `html[data-locale="en"]`; Chinese continues to render the approved background art and existing UI. Optional WebP patches, if required, are imported only by an English-only component branch or referenced only by English-scoped CSS. The implementation must not add a new global framework or runtime dependency.

## Interaction and Accessibility

All existing buttons, sliders, focus order, aria labels, and accessible dialogs remain active and unchanged in behavior. New visual wrappers are decorative and use `aria-hidden="true"` when they repeat accessible text. Pointer events remain on the existing controls. Focus-visible, hover, active, and disabled styles use the same material family and remain legible.

## Testing and QA

Automated verification includes:

- Existing unit, integration, visual-contract, art-contract, campaign, and progression tests.
- Production build.
- A style contract that rejects character/gameplay changes, unscoped English surfaces, pure-white Paper UI, and the old text-local flat-mask declarations.
- English screenshots at 1440×810 and 844×390 for Home, Settings, Day Select, Day 1 gameplay, Tutorial, Multiple Customers, and Summary.
- Chinese regression screenshots for Home, Day Select, Gameplay, and Summary at both reference viewports where useful for comparison.
- Automated checks for browser errors, document overflow, clipped controls, locale markers, and CJK content in English DOM and accessible attributes.
- Visual review of the English contact sheets for residual Chinese glyph edges, rectangular patch seams, typography under 10px, more than three text lines, and button/card crowding.

The QA report assigns `NONE`, `LOW`, `MEDIUM`, or `HIGH` pasted-overlay risk to Home, Settings, Day Select, and Summary. Every final rating must be `LOW` or `NONE`.

## Acceptance Criteria

- English Home, Settings, Day Select, and Summary no longer look like text-local solid masks pasted over Chinese artwork.
- No visible Chinese glyph edge, stroke, or blurred character remains beneath English functional UI in the four priority pages.
- English title and UI typography use only the two approved roles.
- English copy remains readable without layout redesign, fonts below 10px, or uncontrolled wrapping.
- Chinese Before/After remains visually equivalent except for an objectively necessary shared bug fix.
- New English assets, if any, are small WebP patches, load only for English, and have their aggregate byte size reported.
- Home, Settings, Day Select, and Summary pasted-overlay risk are all `LOW` or `NONE`.
- Build and all existing tests pass.
- `Character assets modified: NO`
- `Gameplay logic modified: NO`
- `Campaign/progression modified: NO`
