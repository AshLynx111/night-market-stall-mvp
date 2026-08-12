# Reference Screens, Ingredient Bins, and BGM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five live game screens with the approved reference compositions, provide 15 real metal-bin ingredient assets, and loop the supplied video's audio with persistent volume controls.

**Architecture:** Approved reference images become full-screen 16:9 plates with accessible interactive overlays. Kitchen ingredient buttons consume single precomposed bin PNGs rather than nesting bare ingredient art inside CSS vessels. A small persistent audio-settings module owns master/BGM/SFX levels and a single HTMLAudioElement that survives screen transitions.

**Tech Stack:** React 19, TypeScript, Vite, Vitest/jsdom, Sharp, built-in ImageGen, FFmpeg-compatible audio extraction, Playwright/Edge QA.

## Global Constraints

- Use the five supplied images exactly in the mapping recorded in the design spec.
- Generate all 15 ingredient-bin assets as RGBA PNGs in one consistent warm night-market metal-bin style.
- No bare or floating ingredient image may be rendered in the kitchen.
- Preserve current customer, order, two-griddle, cooking-time, gesture, progression, and Day 5 event behavior.
- The supplied MP4 audio must loop and obey master/BGM/SFX controls after the first user interaction.
- All project-consumed assets must live under `src/assets/approved`.

---

### Task 1: Approved screen asset contract

**Files:**
- Create: `src/assets/approved/main-ui/home-screen-user-final.png`
- Create: `src/assets/approved/main-ui/day-select-user-final.png`
- Create: `src/assets/approved/main-ui/kitchen-screen-user-final.png`
- Create: `src/assets/approved/main-ui/summary-screen-user-final.png`
- Create: `src/assets/approved/main-ui/settings-screen-user-final.png`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/referenceGameplayComposition.test.ts`
- Modify: `scripts/full-art-manifest.mjs`

**Interfaces:**
- Produces five stable imported image URLs for `LandscapeGame` and `KitchenDaySession`.

- [ ] **Step 1: Write the failing page-mapping tests**

Assert the source imports all five exact filenames and renders semantic plates `data-screen-art="home|select|kitchen|summary|settings"`.

- [ ] **Step 2: Run tests and record RED**

Run: `npm test -- --run src/App.test.tsx src/styles/referenceGameplayComposition.test.ts`

- [ ] **Step 3: Copy the five user files into `main-ui` and classify them**

Copy without image regeneration or cropping. Extend `roleFor()` with `approved-screen-composite` and record each user source in `derivativeFor()`.

- [ ] **Step 4: Run focused tests and commit GREEN**

Run the Task 1 tests, then commit `feat: add approved screen plates`.

### Task 2: Generate the 15 metal-bin ingredient assets

**Files:**
- Create: `src/assets/approved/menu/ingredient-bins/ingredient-bin-noodle.png`
- Create one corresponding `ingredient-bin-*.png` for egg, hot-dog, sauce, scallion, cilantro, onion, chili-powder, turkey-noodle, cheese, corn, orleans, bacon, tenderloin, and enoki.
- Create: `scripts/art-remake/validate-ingredient-bins.mjs`
- Create: `src/landscape/kitchen/ingredientBinArtContract.test.ts`
- Modify: `src/landscape/campaign.ts`

**Interfaces:**
- Produces `ingredientBinArt(id: IngredientId): string` or direct bin assets in `CookingStep.asset`.

- [ ] **Step 1: Write the failing 15-asset contract**

Require exact filenames, equal dimensions, 8-bit RGBA, transparent corners, distinct hashes, and non-empty subject coverage.

- [ ] **Step 2: Run the validator test and record RED**

Run: `npm test -- --run src/landscape/kitchen/ingredientBinArtContract.test.ts`

- [ ] **Step 3: Generate one ImageGen source per ingredient**

Use reference image 4 for the bin's angle/material/light and the current ingredient art for identity. Each prompt requires one complete shallow stainless-steel prep bin containing only the named ingredient, warm tungsten reflections, three-quarter top-down game art, flat removable chroma background, no text, no shadow outside the bin.

- [ ] **Step 4: Remove chroma and perform original-resolution QA**

Use the installed ImageGen chroma-removal helper with soft matte and one edge-contract retry if necessary. Reject clipped bins, wrong food identity, perspective mismatch, empty-looking contents, or colored fringe.

- [ ] **Step 5: Save accepted RGBA files and update campaign asset imports**

Ensure all 15 IDs resolve to the new complete bin PNGs.

- [ ] **Step 6: Run the asset contract and commit GREEN**

Run focused test and `npm run validate:art`; commit `feat: add complete ingredient bin art`.

### Task 3: Render complete bins and progressive kitchen layouts

**Files:**
- Modify: `src/components/game/TableIngredient.tsx`
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Modify: `src/styles/kitchen.css`
- Modify: `src/styles/kitchen-layout.test.ts`

**Interfaces:**
- Consumes: complete bin art from Task 2.
- Produces: day-aware non-overlapping kitchen ingredient grid.

- [ ] **Step 1: Write failing DOM and layout tests**

Require each ingredient button to contain exactly one `.table-ingredient__bin-art` image and no `.table-ingredient__vessel`/`.table-ingredient__contents`. Assert Day 1, Day 3, and Day 5 IDs use declared non-overlapping bin positions and remain outside both griddles.

- [ ] **Step 2: Run tests and record RED**

Run the two focused test files.

- [ ] **Step 3: Simplify `TableIngredient` to one complete image**

Preserve pointer drag/tap behavior and use the same bin asset as drag ghost.

- [ ] **Step 4: Implement a compact left-side bin rack**

Use CSS variables/data indices for a 3-column × 5-row table-aligned grid at the left edge. Keep the brush in its own physical slot and hide locked ingredients rather than rendering disabled empty positions.

- [ ] **Step 5: Verify Day 1/3/5 focus screenshots and commit GREEN**

Run focused tests and capture 1440×810 screenshots. Commit `feat: place every ingredient inside a metal bin`.

### Task 4: Replace home and settings interfaces

**Files:**
- Create: `src/game/audioSettings.ts`
- Create: `src/game/audioSettings.test.ts`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/landscape.css`

**Interfaces:**
- Produces `AudioSettings { master: number; music: number; effects: number; musicMuted: boolean }`, parse/save helpers, and controlled setting sliders.

- [ ] **Step 1: Write failing settings persistence and UI tests**

Test clamping 0..1, invalid localStorage fallback, five main-menu hotspots, settings plate opening, three accessible range inputs, quick music toggle, and return behavior.

- [ ] **Step 2: Run tests and record RED**

- [ ] **Step 3: Implement settings state and full-screen plate overlays**

The home plate uses the approved home image. Settings uses the approved settings image plus three transparent-styled range inputs aligned with its three rails and a return hotspot.

- [ ] **Step 4: Run focused tests and commit GREEN**

Commit `feat: implement approved home and settings screens`.

### Task 5: Replace selection and summary interfaces

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/landscape.css`

**Interfaces:**
- Consumes campaign save, `DAYS`, `UpgradeShop`, and summary data.

- [ ] **Step 1: Write failing reference-screen behavior tests**

Test all six day hit targets, locked-day prevention, real star text, back action, real upgrade state, summary values, replay, and next-day actions.

- [ ] **Step 2: Run tests and record RED**

- [ ] **Step 3: Implement plate-aligned interactive overlays**

Render the select and summary images as 16:9 plates. Place semantic dynamic overlays only over regions whose numbers/states must change; mask baked sample numbers locally with matching parchment/wood panels. Keep buttons keyboard accessible.

- [ ] **Step 4: Run focused tests and commit GREEN**

Commit `feat: implement approved selection and summary screens`.

### Task 6: Apply the approved kitchen composition

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/components/game/KitchenScene.tsx`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Modify: `src/landscape.css`
- Modify: `src/styles/kitchen.css`

**Interfaces:**
- Consumes the approved kitchen screen as structural background and all existing live game state.

- [ ] **Step 1: Write failing kitchen composition tests**

Require approved kitchen plate, three lane anchors, bubble face clearance, two griddle hitboxes, left bin rack, HUD alignment, and no duplicated baked-in customers behind live customers.

- [ ] **Step 2: Run tests and record RED**

- [ ] **Step 3: Integrate the kitchen plate without breaking live state**

Use the reference image's counter/table layout while masking/replacing the baked sample customer region with the clean night-market background before live customer rendering. Preserve the exact two-griddle gesture rectangles and cumulative food-stage rendering.

- [ ] **Step 4: Run focused tests and commit GREEN**

Commit `feat: match approved kitchen composition`.

### Task 7: Extract and integrate looping BGM

**Files:**
- Create: `src/assets/audio/night-market-bgm.m4a` or `night-market-bgm.mp3`
- Create: `src/game/bgm.ts`
- Create: `src/game/bgm.test.ts`
- Modify: `src/game/audio.ts`
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/game/audio.test.ts`

**Interfaces:**
- Produces `unlockAndPlayBgm(settings)`, `applyAudioSettings(settings)`, and `stopBgm()` over one looped `HTMLAudioElement`.

- [ ] **Step 1: Write failing BGM lifecycle tests**

Mock `Audio`, assert `loop=true`, no play before interaction, one element across screen changes, music volume = master × music or zero when muted, and sound-effect gain = master × effects.

- [ ] **Step 2: Run tests and record RED**

- [ ] **Step 3: Extract the MP4 audio**

Use an available FFmpeg runtime (install a project-local binary dependency only if no runtime binary exists), remove video, normalize to a safe peak, encode a browser-supported asset, and verify duration/non-empty audio stream.

- [ ] **Step 4: Implement persistent BGM and mix controls**

Start only from the first trusted click/pointer/key interaction. Keep playback alive across page transitions and synchronize HUD/home music buttons with settings.

- [ ] **Step 5: Run focused audio tests and commit GREEN**

Commit `feat: loop supplied soundtrack with volume controls`.

### Task 8: Full browser acceptance and deployment

**Files:**
- Create or modify: `scripts/current-reference-screens-qa.mjs`
- Create: `artifacts/reference-screens-qa/result.json`
- Create screenshots under: `artifacts/reference-screens-qa/`

**Interfaces:**
- Validates the complete user journey and deployment candidate.

- [ ] **Step 1: Run all automated gates**

Run `npm run validate:art`, `npm test -- --run`, and `npm run build`; all must exit 0.

- [ ] **Step 2: Execute a real-browser journey at 1440×810**

Open home, test settings sliders/BGM, return, open select, start Day 1, complete the tutorial and summary, then inspect Day 3 and Day 5 fixtures for every newly unlocked bin.

- [ ] **Step 3: Inspect screenshots at original detail**

Reject any floating ingredient, empty bin, overlap with griddle/tutorial, clipped plate, unreadable dynamic value, bubble-face collision, or inactive audio control.

- [ ] **Step 4: Commit final QA evidence and push `main`**

Confirm clean worktree, push, wait for GitHub Pages success, and verify HTTP 200 plus the new production bundle hash.
