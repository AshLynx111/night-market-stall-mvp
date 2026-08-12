# Task 2 Report — Complete Ingredient-Bin Art

## Status

Complete. Fifteen distinct ingredient props were generated with the built-in ImageGen tool, converted from a removable chroma-key source to transparent PNG, visually accepted, validated, and connected to the campaign asset map. Runtime rendering/layout is deliberately left for Task 3.

## TDD record

- Added `scripts/art-remake/validate-ingredient-bins.mjs`.
- Added `src/landscape/kitchen/ingredientBinArtContract.test.ts`.
- RED command: `npm test -- --run src/landscape/kitchen/ingredientBinArtContract.test.ts`
- RED result: 1 failed; the validator named all fifteen missing exact filenames.
- GREEN command: `npm test -- --run src/landscape/kitchen/ingredientBinArtContract.test.ts src/landscape/kitchen/assets.test.ts`
- GREEN result: 2 files passed, 14 tests passed.

The contract verifies:

- the exact set of fifteen filenames;
- one shared dimension (`768x768`);
- PNG, 8-bit RGBA output;
- transparent corner pixels;
- plausible non-transparent subject coverage;
- distinct SHA-256 hashes (no duplicate stand-ins).

## Generation method

- Mode: built-in ImageGen; one tool call per distinct ingredient.
- Bin/perspective reference: `C:/Users/qianwu/AppData/Local/Temp/codex-clipboard-2c88d9c3-bf27-4bb2-9bd6-8374003fa788.png`.
- Identity references: the corresponding images in `src/assets/approved/menu/ingredients/`.
- Source background: perfectly flat `#ff00ff` chroma key.
- Removal helper: `C:/Users/qianwu/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py`.
- Removal settings: border auto-key, soft matte, transparent threshold 12, opaque threshold 220, despill, edge contract 1.
- Final normalization: proportional `contain` fit onto transparent `768x768` RGBA canvas; no stretching or clipping.

## Prompt set

Every distinct ingredient used the following normalized prompt, with the ingredient-specific subject below:

> Use case: stylized-concept. Asset type: transparent game ingredient prop. Image 1 is the mandatory kitchen composition/material/perspective reference; Image 2 is the mandatory ingredient identity reference. Create exactly ONE complete shallow rectangular stainless-steel Chinese street-food prep bin containing only [SUBJECT]. Polished semi-realistic hand-painted 2D game art matching Image 1. Isolated centered object in a consistent 35-degree three-quarter top-down view, long edge horizontal, entire rim, all four corners, side walls and bottom fully visible, generous padding, no clipping, bin about 70% of a square canvas. Warm tungsten night-market light from upper left with believable amber highlights and dark steel reflections. Strictly preserve Image 2's recognizable color, shape, cut and texture. Fill generously but keep the rim visible. The food must physically sit inside below the rim. Perfectly flat uniform solid #ff00ff chroma-key background. One bin only; no floating pieces, other ingredients, utensils, labels, text, watermark, cast shadow outside the bin, floor plane, background gradient or texture; no #ff00ff in the subject.

Ingredient-specific subjects:

| ID | Subject specification |
|---|---|
| noodle | stack of pale-yellow rectangular grilled-cold-noodle sheets |
| egg | five intact light-brown raw eggs |
| hot-dog | five short red-brown sausages |
| sauce | glossy, thick, dark red-brown secret grilling sauce |
| scallion | abundant finely sliced fresh green scallion rings |
| cilantro | fresh cilantro leaves and short stems in varied greens |
| onion | short thin curved translucent ivory-white onion strips with a few pale lavender edges |
| chili-powder | a loose mound of fine vivid-red chili powder |
| turkey-noodle | cooked curly Korean fire noodles coated in glossy red-orange hot sauce |
| cheese | five slightly offset square pale-yellow cheese slices |
| corn | abundant plump glossy yellow sweet-corn kernels |
| orleans | thick strips of orange-red Orleans chicken with spice/grill marks |
| bacon | six thick pink-red bacon strips with visible white fat marbling |
| tenderloin | 10–12 thin irregular oval reddish-brown marinated pork tenderloin slices with meat fiber and pepper |
| enoki | neat bundles of fresh ivory enoki with long stems and small caps |

Two targeted retry prompts were used after rejection:

- `onion`: explicitly required raw translucent white onion strips and prohibited fish, fish skin, meat, seafood, cubes, and black stripes.
- `tenderloin`: explicitly required reddish-brown marinated pork slices with muscle fibers and pepper and prohibited bread, buns, sausage, fish, and chicken breast.

## Original-detail visual acceptance

All accepted sources were viewed at original detail before removal. The transparent set was then reviewed together on a dark contact sheet and measured programmatically.

Acceptance checks:

- complete bin silhouette and all four corners visible;
- food unmistakably contained below the metal rim;
- no floating pieces, external shadow, utensils, labels, or text;
- broadly consistent three-quarter top-down perspective and horizontal long edge;
- warm tungsten reflections matching the kitchen reference;
- identifiable ingredient with non-empty contents;
- no visible magenta fringe after removal.

Rejected/replaced sources:

- First onion source resembled fish-skin cubes; rejected and regenerated.
- First tenderloin source resembled bread rolls; rejected and regenerated.

Final alpha bounds all retain safe transparent padding. A pixel scan found zero opaque pixels matching a magenta-fringe heuristic in all fifteen finals.

## Final output paths

All files are under `src/assets/approved/menu/ingredient-bins/`:

- `ingredient-bin-noodle.png`
- `ingredient-bin-egg.png`
- `ingredient-bin-hot-dog.png`
- `ingredient-bin-sauce.png`
- `ingredient-bin-scallion.png`
- `ingredient-bin-cilantro.png`
- `ingredient-bin-onion.png`
- `ingredient-bin-chili-powder.png`
- `ingredient-bin-turkey-noodle.png`
- `ingredient-bin-cheese.png`
- `ingredient-bin-corn.png`
- `ingredient-bin-orleans.png`
- `ingredient-bin-bacon.png`
- `ingredient-bin-tenderloin.png`
- `ingredient-bin-enoki.png`

## Integration

- `src/landscape/campaign.ts` imports all fifteen complete-bin assets and exports `INGREDIENT_BIN_ART` keyed by every `IngredientId`.
- Every ingredient-based `CookingStep.asset` now resolves to a complete-bin PNG.
- `src/landscape/kitchen/assets.ts` consumes the same campaign map so `ingredientArt(id)` cannot drift from the recipe data.
- `scripts/full-art-manifest.mjs` classifies the new folder as `tabletop-ingredient-bin`.

## Verification

- `node scripts/art-remake/validate-ingredient-bins.mjs` → 15 validated at 768x768.
- Focused Vitest → 14/14 passed.
- `npm run validate:art` → 425 assets validated across 5 families.
- `npm run build` → TypeScript and Vite production build passed.

## Concerns / handoff

- The source art intentionally has slight organic angle and fill variation so the bins do not appear cloned; all remain within the approved approximately 35-degree family.
- Final PNGs are high-quality 768px assets (roughly 0.48–0.78 MB each). Task 3 should size the complete bin itself and must not add a second CSS-drawn container behind it.
- Temporary chroma sources and the QA contact sheet remain under the gitignored `tmp/ingredient-bins*` paths and are not runtime dependencies.
