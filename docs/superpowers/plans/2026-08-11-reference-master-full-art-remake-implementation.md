# Reference-Master Full Art Remake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every runtime-visible art asset and CSS-drawn interface element with a coherent visual system derived from the approved 16:9 night-market reference while preserving the existing game rules.

**Architecture:** Treat scene, character, food, cooking-stage, and UI art as five source-master families. Native generation creates only approved masters and state sheets; deterministic scripts perform chroma removal, normalization, atlas assembly, menu composition, manifests, contact sheets, and optimized runtime exports. Existing recipe, customer-timeline, service, progression, and persistence code remains authoritative.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest, CSS, PNG/SVG, built-in ImageGen, Node asset validators, deterministic local image processing.

## Global Constraints

- The user reference image is the only visual master.
- Preserve the identities, ages, roles, and signature clothing of the ten existing regular customers.
- Redraw the Day 5 celebrity as an original, exceptionally handsome, polite young Chinese actor in the same high-quality light-anime world; do not reproduce a real celebrity.
- Replace all 251 files under `src/assets/approved/` or deterministically derive them from new masters.
- Replace all runtime-visible CSS HUD, tutorial, feedback, bubble, progress, and modal styling.
- Preserve gameplay rules, day progression, recipes, three concurrent customer lanes, two griddle slots, gestures, tutorial behavior, and Day 5 event behavior.
- The background contains no fixed bystanders or chairs.
- Ingredients live directly on the counter and do not use a labeled inventory bar.
- Order bubbles stay above their owners and never cover faces.
- Critical Chinese copy, prices, and labels are code or SVG text, never generated bitmap text.
- Do not remove the old asset set until the replacement set passes automated and visual gates.
- Run asset-family checks without asking the user to approve individual images; deliver one final full-set review.

---

### Task 1: Freeze the asset contract and generate a complete manifest

**Files:**

- Create: `scripts/full-art-manifest.mjs`
- Create: `scripts/validate-full-art-assets.mjs`
- Create: `src/landscape/kitchen/fullArtManifest.test.ts`
- Create: `artifacts/reference-remake/manifests/full-art-manifest.json`
- Modify: `package.json`

**Interfaces:**

- Consumes: current files under `src/assets/approved/`, `CUSTOMER_ART_IDS`, `CUSTOMER_ART_MOODS`, `HEAT_CHECKPOINTS`, `RECIPES`, and `INGREDIENT_UNLOCK_DAY`.
- Produces: `buildFullArtManifest(): Promise<AssetRecord[]>`, where `AssetRecord` is `{ path: string; family: string; role: string; width: number; height: number; alphaRequired: boolean; derivedFrom?: string }`; `npm run validate:art` validates the entire contract.

- [ ] **Step 1: Write the failing manifest test**

```ts
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('full reference-remake art contract', () => {
  it('tracks every approved asset and all required visual families', () => {
    const raw = execFileSync(process.execPath, ['scripts/full-art-manifest.mjs', '--json'], { encoding: 'utf8' })
    const manifest = JSON.parse(raw) as { assets: { path: string; family: string }[] }
    expect(manifest.assets).toHaveLength(251)
    expect(new Set(manifest.assets.map((asset) => asset.family))).toEqual(new Set([
      'customers', 'events', 'main-ui', 'menu', 'stages',
    ]))
  })
})
```

- [ ] **Step 2: Run the focused test and record RED**

Run: `npx vitest run src/landscape/kitchen/fullArtManifest.test.ts`

Expected: FAIL because `scripts/full-art-manifest.mjs` does not exist.

- [ ] **Step 3: Implement the manifest generator and validator**

`scripts/full-art-manifest.mjs` must recursively enumerate `src/assets/approved`, read PNG IHDR metadata without altering files, classify each stable relative path, mark derivative atlases and composites, and emit sorted JSON. `scripts/validate-full-art-assets.mjs` must verify file existence, non-zero dimensions, PNG signature, required alpha, transparent corners for cutouts, and exact manifest membership.

Add scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "validate:art": "node scripts/validate-full-art-assets.mjs"
  }
}
```

- [ ] **Step 4: Run GREEN checks**

Run: `node scripts/full-art-manifest.mjs --write artifacts/reference-remake/manifests/full-art-manifest.json`

Run: `npx vitest run src/landscape/kitchen/fullArtManifest.test.ts`

Expected: PASS and exactly 251 sorted records.

- [ ] **Step 5: Commit**

```powershell
git add package.json scripts/full-art-manifest.mjs scripts/validate-full-art-assets.mjs src/landscape/kitchen/fullArtManifest.test.ts
git add -f artifacts/reference-remake/manifests/full-art-manifest.json
git commit -m "test: freeze full art replacement contract"
```

### Task 2: Build deterministic source-master export tooling

**Files:**

- Create: `scripts/art-remake/export-cutout.mjs`
- Create: `scripts/art-remake/assemble-atlas.mjs`
- Create: `scripts/art-remake/build-contact-sheet.mjs`
- Create: `scripts/art-remake/optimize-runtime-assets.mjs`
- Create: `scripts/art-remake/export-tools.test.ts`
- Create: `artifacts/reference-remake/style/style-bible.json`

**Interfaces:**

- Consumes: native PNG outputs with uniform chroma backgrounds or already-authored alpha.
- Produces: `exportCutout(input, output, options)`, `assembleAtlas({ frames, columns, rows, cellWidth, cellHeight, output })`, `buildContactSheet(manifest, output)`, and optimized RGBA runtime PNGs with stable dimensions.

- [ ] **Step 1: Create RED fixtures and tests**

Test transparent corners, preserved hair/food-edge pixels, exact atlas geometry, transparent unused atlas cells, stable SHA-256 output for repeated runs, and contact-sheet membership.

```ts
expect(await sha256(firstExport)).toBe(await sha256(secondExport))
expect(atlas.width).toBe(columns * cellWidth)
expect(atlas.height).toBe(rows * cellHeight)
expect(atlas.unusedCells.every((cell) => cell.alphaMax === 0)).toBe(true)
```

- [ ] **Step 2: Run tests and record RED**

Run: `npx vitest run scripts/art-remake/export-tools.test.ts`

Expected: FAIL because the four export modules do not exist.

- [ ] **Step 3: Implement minimal deterministic exports**

Use the bundled workspace image libraries discovered by `codex_app__load_workspace_dependencies`. Chroma removal must support an edge contraction option; atlas assembly must never resample accepted cells; final optimization must strip metadata without changing decoded pixels.

- [ ] **Step 4: Write the style bible**

`style-bible.json` must store the approved palette, 16:9 composition, camera angle, left-top warm key light, right-bottom contact shadow, character proportions, forbidden textures, UI material recipe, and reference image path. Every generation prompt consumes this file.

- [ ] **Step 5: Run GREEN and commit**

Run: `npx vitest run scripts/art-remake/export-tools.test.ts`

Expected: PASS with byte-stable fixture outputs.

```powershell
git add scripts/art-remake artifacts/reference-remake/style/style-bible.json
git commit -m "feat: add deterministic art master exports"
```

### Task 3: Remake the scene, counter, griddles, and UI kit

**Files:**

- Replace: `src/assets/approved/main-ui/night-market-clean-background.png`
- Replace: `src/assets/approved/main-ui/game-main-screen-final.png`
- Create: `artifacts/reference-remake/masters/scene/night-market-background-master.png`
- Create: `artifacts/reference-remake/masters/scene/counter-and-griddles-master.png`
- Create: `artifacts/reference-remake/masters/ui/ui-material-kit-master.png`
- Create: `artifacts/reference-remake/review/scene-ui-contact-sheet.png`
- Create: `src/styles/referenceVisualTokens.test.ts`
- Modify: `src/landscape.css`
- Modify: `src/styles/kitchen.css`

**Interfaces:**

- Consumes: the approved reference and `style-bible.json`.
- Produces: clean background art with no bystanders/chairs, a stable counter/griddle composition, and CSS custom properties `--ui-wood`, `--ui-cream`, `--ui-green`, `--ui-gold`, `--ui-danger`, and `--ui-shadow`.

- [ ] **Step 1: Write RED visual-token tests**

```ts
expect(css).toContain('--ui-wood:')
expect(css).toContain('--ui-cream:')
expect(css).toContain('--ui-green:')
expect(css).not.toContain('linear-gradient(180deg, #fff')
```

The test also checks that the kitchen scene uses the new background path and that interactive ingredient and griddle hit boxes remain transparent.

- [ ] **Step 2: Generate three native masters**

Generate the background, counter/griddles, and UI material kit as separate clean assets. Inspect each at original detail for Chinese night-market context, central vanishing point, warm lamps, correct twin-griddle scale, no fixed people, no chairs, no readable gibberish, and no UI text baked into raster art. Retry only a rejected master, at most twice.

- [ ] **Step 3: Export and integrate**

Use deterministic crops and composites to replace the two runtime main-UI files. Update CSS variables and component skins without changing hit-box geometry or game logic.

- [ ] **Step 4: Run focused and visual checks**

Run: `npx vitest run src/styles/referenceVisualTokens.test.ts src/styles/kitchen-layout.test.ts`

Expected: PASS. Capture 1440×810 and 844×390 empty-counter screenshots and verify no fixed customers, chairs, or oversized griddle.

- [ ] **Step 5: Commit**

```powershell
git add src/assets/approved/main-ui src/landscape.css src/styles/kitchen.css src/styles/referenceVisualTokens.test.ts
git add -f artifacts/reference-remake/masters/scene artifacts/reference-remake/masters/ui artifacts/reference-remake/review/scene-ui-contact-sheet.png
git commit -m "feat: remake night market scene and interface skin"
```

### Task 4: Remake ingredients, finished dishes, menu, and packaging

**Files:**

- Replace: `src/assets/approved/menu/ingredients/*.png`
- Replace: `src/assets/approved/menu/dishes/*.png`
- Replace: `src/assets/approved/menu/takeaway-bag.png`
- Replace: `src/assets/approved/menu/menu-board.svg`
- Replace: `src/assets/approved/menu/menu-board.png`
- Create: `artifacts/reference-remake/masters/food/*`
- Create: `artifacts/reference-remake/review/food-contact-sheet.png`
- Create: `src/landscape/kitchen/foodArtContract.test.ts`

**Interfaces:**

- Consumes: fixed three-quarter top-down camera, warm key light, actual `RECIPES`, `INGREDIENT_UNLOCK_DAY`, menu names, and prices.
- Produces: 18 distinguishable tabletop ingredients, 5 finished dishes, packaging art, and an editable menu SVG whose raster export is deterministic.

- [ ] **Step 1: Write the failing food-contract test**

The test asserts exact ingredient and dish membership, alpha corners, canonical dimensions, menu copy and prices, and non-identical perceptual hashes for easily confused meat ingredients.

```ts
expect(menuSvg).toContain('招牌芝士火鸡烤冷面')
expect(menuSvg).toContain('¥16')
expect(distance(hash('ingredient-hot-dog.png'), hash('ingredient-tenderloin.png'))).toBeGreaterThan(0.12)
```

- [ ] **Step 2: Generate food masters by identity-preserving families**

Generate isolated ingredient masters and five finished-dish masters with the same camera, scale, container logic, light, and food material. The dish prompts must specify only canonical recipe contents. Inspect each at original resolution; reject cropped food, wrong ingredient count, plastic texture, unrelated garnish, mixed camera, or ambiguous meat silhouette.

- [ ] **Step 3: Export menu and runtime files**

Remove chroma locally, normalize canvas occupancy, build the SVG with exact code-authored Chinese text and prices, export its PNG, and build `food-contact-sheet.png`.

- [ ] **Step 4: Run GREEN and commit**

Run: `npx vitest run src/landscape/kitchen/foodArtContract.test.ts src/landscape/kitchen/assets.test.ts`

Expected: PASS; all ingredients resolve through `ingredientArt`.

```powershell
git add src/assets/approved/menu src/landscape/kitchen/foodArtContract.test.ts
git add -f artifacts/reference-remake/masters/food artifacts/reference-remake/review/food-contact-sheet.png
git commit -m "feat: remake menu dishes and tabletop ingredients"
```

### Task 5: Remake all cumulative cooking, heat, and modifier states

**Files:**

- Replace: `src/assets/approved/stages/classic/*.png`
- Replace: `src/assets/approved/stages/big-eater/*.png`
- Replace: `src/assets/approved/stages/orleans/*.png`
- Replace: `src/assets/approved/stages/tenderloin/*.png`
- Replace: `src/assets/approved/stages/signature/*.png`
- Replace: `src/assets/approved/stages/heat/**/*.png`
- Replace: `src/assets/approved/stages/modifiers/**/*.png`
- Replace: `src/assets/approved/stages/*-stage-atlas.png`
- Create: `artifacts/reference-remake/masters/stages/*`
- Create: `artifacts/reference-remake/review/stage-contact-sheets/*`
- Create: `src/landscape/kitchen/stageContinuity.test.ts`

**Interfaces:**

- Consumes: the new food masters and the exact ordered steps in `RECIPES`.
- Produces: 49 cumulative stages, 44 heat variants, 16 modifier visuals, and 5 derived stage atlases with continuous geometry.

- [ ] **Step 1: Write RED continuity tests**

Tests must validate exact file counts, dimensions and alpha, recipe stage membership, transparent background, stable food bounding box, successive-stage similarity, visibly distinct heat states, and persistent topping overlays.

```ts
expect(stageFiles).toHaveLength(49)
expect(heatFiles).toHaveLength(44)
expect(modifierFiles).toHaveLength(16)
expect(iou(previous.foodBounds, next.foodBounds)).toBeGreaterThan(0.72)
```

- [ ] **Step 2: Produce recipe master sequences**

For each recipe, create one locked base composition and edit it cumulatively through every step. Generate or edit only the changed food layer; keep camera, plate location, shadow, food scale, and prior ingredients fixed. Inspect sequences as contact sheets before export.

- [ ] **Step 3: Produce heat and modifier variants**

Derive raw, ready, scorched, and burnt variants from the exact checkpoint master. Express heat through coagulation, edge color, oil sheen, and char—not text filters. Derive extras and no-scallion cut/roll states from the matching canonical stages.

- [ ] **Step 4: Assemble atlases and run GREEN**

Run: `node scripts/art-remake/assemble-atlas.mjs --family stages`

Run: `npx vitest run src/landscape/kitchen/stageContinuity.test.ts src/landscape/kitchen/assets.test.ts`

Expected: PASS; `stageArt` resolves every canonical, heat, and modifier case.

- [ ] **Step 5: Commit**

```powershell
git add src/assets/approved/stages src/landscape/kitchen/stageContinuity.test.ts
git add -f artifacts/reference-remake/masters/stages artifacts/reference-remake/review/stage-contact-sheets
git commit -m "feat: remake every cooking and heat stage"
```

### Task 6: Remake the ten regular customers and all state art

**Files:**

- Replace: `src/assets/approved/customers/customer-*.png`
- Replace: `src/assets/approved/customers/final-light-anime/customer-*.png`
- Replace: `src/assets/approved/customers/emotions/customer-*/*.png`
- Replace: `src/assets/approved/customers/motion/customer-*-motion.png`
- Create: `artifacts/reference-remake/masters/customers/regular/*`
- Create: `artifacts/reference-remake/review/regular-customer-contact-sheet.png`
- Modify: `scripts/validate-customer-motion-assets.mjs`
- Create: `src/landscape/kitchen/customerIdentityContract.test.ts`

**Interfaces:**

- Consumes: ten fixed identity briefs, the scene light rig, `CUSTOMER_ART_MOODS`, and the existing 8×3 atlas contract.
- Produces: ten identity masters, 70 regular-customer mood outputs, ten refreshed base/final exports, and ten 24-cell motion atlases.

- [ ] **Step 1: Write RED identity and motion tests**

Test membership, alpha, face/garment consistency across moods, distinct silhouette clusters between customers, fixed foot baselines, non-bobbing turn frames, and sufficient walk silhouette diversity in every row.

```ts
expect(identitySimilarity(customerMoodFaces)).toBeGreaterThan(0.78)
expect(minimumInterCustomerDistance(customerNeutralFaces)).toBeGreaterThan(0.10)
expect(walkRowDistinctFrames(atlas, row)).toBeGreaterThanOrEqual(4)
```

- [ ] **Step 2: Generate ten neutral identity masters**

Use the approved role, age, hair, garment, and temperament for each customer. Enforce adult proportions, individual face shapes, distinct silhouettes, no duplicate heads, no oversized eyes, and the same warm night-market rim light.

- [ ] **Step 3: Edit each accepted identity into moods and motion rows**

Derive seven emotions and the arrival/walk/turn/leave frame rows from the neutral master. Do not regenerate a customer from text after their identity master is accepted. Inspect original-resolution contact sheets for face drift, clothing drift, clipped limbs, repeated frames, and baseline shifts.

- [ ] **Step 4: Export, assemble, and validate**

Run: `node scripts/validate-customer-motion-assets.mjs`

Run: `npx vitest run src/landscape/kitchen/customerIdentityContract.test.ts src/landscape/kitchen/customerMotionAssetValidator.test.ts src/landscape/kitchen/assets.test.ts`

Expected: PASS for all ten customers and all rows.

- [ ] **Step 5: Commit**

```powershell
git add src/assets/approved/customers scripts/validate-customer-motion-assets.mjs src/landscape/kitchen/customerIdentityContract.test.ts
git add -f artifacts/reference-remake/masters/customers/regular artifacts/reference-remake/review/regular-customer-contact-sheet.png
git commit -m "feat: remake regular customer art and motion"
```

### Task 7: Remake the celebrity and Day 5 event art

**Files:**

- Replace: `src/assets/approved/customers/emotions/celebrity/*.png`
- Replace: `src/assets/approved/customers/motion/celebrity-motion.png`
- Replace: `src/assets/approved/events/day5-celebrity-event-key-art.png`
- Create: `artifacts/reference-remake/masters/customers/celebrity/*`
- Create: `artifacts/reference-remake/masters/events/day5-celebrity-event-master.png`
- Create: `artifacts/reference-remake/review/celebrity-contact-sheet.png`
- Create: `src/landscape/kitchen/celebrityArtContract.test.ts`

**Interfaces:**

- Consumes: celebrity character brief, regular-customer scale contract, Day 5 order/event logic, and approved scene master.
- Produces: one stable celebrity identity, seven moods, one 24-cell motion atlas, and one event key art compatible with the main scene.

- [ ] **Step 1: Write RED celebrity tests**

Test asset membership, adult head-to-body ratio, fixed face identity across moods, matching environment light, exact atlas layout, and event image dimensions. Add a source prompt check forbidding real-person names and likeness reproduction.

- [ ] **Step 2: Generate the celebrity identity master**

Create an original young Chinese film-star archetype with a small head, long balanced proportions, clear double eyelids, restrained upper-eye shadow, large but adult eyes, smooth young skin, polite expression, and understated dark travel clothing. Reject age lines, waxy skin, photo-composite realism, childish face, or resemblance to a named real person.

- [ ] **Step 3: Derive moods, motion, and event art**

Keep the identity master fixed. In event art he queues and orders politely while regular customers react through glances and posture; the counter remains the gameplay focus and no reaction blocks controls.

- [ ] **Step 4: Run GREEN and commit**

Run: `npx vitest run src/landscape/kitchen/celebrityArtContract.test.ts src/landscape/kitchen/customerMotionAssetValidator.test.ts`

Expected: PASS.

```powershell
git add src/assets/approved/customers/emotions/celebrity src/assets/approved/customers/motion/celebrity-motion.png src/assets/approved/events src/landscape/kitchen/celebrityArtContract.test.ts
git add -f artifacts/reference-remake/masters/customers/celebrity artifacts/reference-remake/masters/events artifacts/reference-remake/review/celebrity-contact-sheet.png
git commit -m "feat: remake celebrity and Day 5 event art"
```

### Task 8: Integrate the reference HUD, bubbles, tutorial, and responsive layout

**Files:**

- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/game/CustomerActor.tsx`
- Modify: `src/components/game/GriddleSlot.tsx`
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/components/game/CookingGestureLayer.tsx`
- Modify: `src/landscape.css`
- Modify: `src/styles/kitchen.css`
- Modify: `src/styles/kitchen-layout.test.ts`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Create: `src/styles/referenceHud.test.ts`

**Interfaces:**

- Consumes: new scene, character, food, stage, and UI assets; existing `KitchenState` and dispatch actions.
- Produces: reference-matched HUD and tutorial presentation without changing reducer semantics or interaction targets.

- [ ] **Step 1: Write RED structure and style tests**

Assert one top HUD layer, compact customer-owned bubbles, no left order panel, no labeled inventory bar, two griddle targets, three customer lanes, tutorial content outside food art, and `prefers-reduced-motion` coverage.

```ts
expect(screen.queryByTestId('left-order-panel')).not.toBeInTheDocument()
expect(screen.getAllByTestId('griddle-slot')).toHaveLength(2)
expect(screen.getAllByTestId('customer-lane')).toHaveLength(3)
expect(css).toContain('@media (prefers-reduced-motion: reduce)')
```

- [ ] **Step 2: Implement the reference hierarchy**

Use hanging wood/cream plaques for day, satisfaction, money, target, and pause. Keep order art in the owner bubble. Place ingredients directly over the counter containers with transparent controls. Preserve the sauce-brush two-stroke tutorial gesture and all drag/touch behavior.

- [ ] **Step 3: Tune responsive geometry**

Define tested layouts for 1440×810, 1280×720, 1024×576, and 844×390. Customer faces, bubbles, tutorial boards, tray, griddles, and ingredients must remain clear and clickable. Do not solve narrow layouts by scaling the entire scene below readable size.

- [ ] **Step 4: Run focused interaction tests**

Run: `npx vitest run src/styles/referenceHud.test.ts src/styles/kitchen-layout.test.ts src/components/game/KitchenScene.test.tsx src/landscape/kitchen/gestures.test.ts src/landscape/kitchen/tutorialPaths.test.ts`

Expected: PASS with unchanged gameplay actions.

- [ ] **Step 5: Commit**

```powershell
git add src/components src/landscape.css src/styles/kitchen.css src/styles/referenceHud.test.ts src/styles/kitchen-layout.test.ts
git commit -m "feat: integrate reference HUD and tutorial presentation"
```

### Task 9: Full visual QA, package, and playable delivery

**Files:**

- Create: `scripts/capture-reference-remake-qa.mjs`
- Create: `docs/qa/reference-remake/browser-qa-results.json`
- Create: `docs/qa/reference-remake/contact-sheet.png`
- Create: `docs/qa/reference-remake/*.png`
- Create: `artifacts/reference-remake/FINAL-ASSET-INVENTORY.md`
- Create: `artifacts/reference-remake/night-market-final-art.zip`
- Modify: `README.md`

**Interfaces:**

- Consumes: complete runtime assets and integrated application.
- Produces: synchronized screenshot evidence, full contact sheet, final organized asset package, successful production build, and playable deployment URL.

- [ ] **Step 1: Add QA evidence validation**

Capture and validate Day 1 tutorial stages, three active customers, both griddles occupied, Day 3 turkey-noodle order, raw/ready/scorched/burnt heat, Day 5 celebrity arrival/order/exit, Day 6 modifiers, day summary, and all four viewport sizes. Manifest records must include repo-relative PNG paths, DOM/state diagnostics, decoded-image hash, and current PNG SHA-256.

- [ ] **Step 2: Run all automated gates**

Run: `npm run validate:art`

Run: `npm test`

Run: `npx tsc -b --pretty false`

Run: `npm run build`

Expected: all commands exit 0; art validator reports exactly 251 replacement files.

- [ ] **Step 3: Capture and inspect final contact sheets**

Run: `node scripts/capture-reference-remake-qa.mjs`

Inspect the full contact sheet and key screenshots at original detail. Reject any visible old-style asset, fixed background person, chair, face drift, bubble-face overlap, stage discontinuity, wrong recipe content, or rasterized Chinese gibberish.

- [ ] **Step 4: Package the final art folder**

Copy only the final approved source masters, runtime exports, style bible, manifests, contact sheets, and inventory into `artifacts/reference-remake/final-package/`. Create `night-market-final-art.zip` deterministically from that folder; do not include caches, rejected attempts, secrets, `node_modules`, or temporary chroma files.

- [ ] **Step 5: Deploy and verify the playable link**

Use the repository's existing GitHub Pages workflow or its configured hosting route. Verify the deployed URL loads a fresh production build, Day 1 tutorial completes, progression remains locked until earned, Day 3 exposes turkey noodles, and Day 5 loads the celebrity event.

- [ ] **Step 6: Commit final evidence and handoff**

```powershell
git add README.md scripts/capture-reference-remake-qa.mjs
git add -f docs/qa/reference-remake artifacts/reference-remake/FINAL-ASSET-INVENTORY.md artifacts/reference-remake/night-market-final-art.zip
git commit -m "chore: package and verify reference art remake"
```

Final handoff reports the playable URL, final asset package path, tests, build, asset count, and any non-blocking rendering caveat.
