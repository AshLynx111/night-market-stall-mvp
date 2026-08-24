# Gameplay UI Polish V6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace heavy runtime PNG delivery with deterministic, visually equivalent WebP derivatives and enforce home and Day 1 transfer budgets.

**Architecture:** Approved PNGs remain immutable masters. A Sharp-based builder writes a mirrored runtime tree plus manifest; application imports use only that tree, while contract tests validate freshness, dimensions, compression, and representative pixel quality.

**Tech Stack:** Node.js, Sharp, SHA-256, React 19, TypeScript, Vite, Vitest, Playwright.

## Global Constraints

- Do not modify or delete files under `src/assets/approved`.
- Use WebP quality 92, alpha quality 100, smart subsampling, and effort 5.
- Keep every derivative at the exact source width and height.
- Require aggregate runtime bytes at most 25% of aggregate source bytes.
- Require critical-plate mean absolute RGB error at most 3.0 and PSNR at least 35dB.
- Keep cold home transfer at most 800KB and home-to-active-Day-1 transfer at most 3,500KB including audio.
- Do not add dependencies or change gameplay, economy, progression, or saved data.

---

### Task 1: Runtime derivative builder and contract

**Files:**
- Create: `scripts/build-runtime-webp-assets.mjs`
- Create: `src/landscape/kitchen/runtimeAssetContract.test.ts`
- Create: `src/assets/runtime/manifest.json`
- Create: `src/assets/runtime/**/*.webp`

**Interfaces:**
- Produces CLI: `node scripts/build-runtime-webp-assets.mjs [--check] [--json]`.
- Produces manifest entries `{ source, runtime, sourceHash, width, height, sourceBytes, runtimeBytes }`.

- [ ] Write a failing contract test that runs `--check --json`, requires at least 300 tracked derivatives, and requires `runtimeBytes / sourceBytes <= 0.25`.
- [ ] Add representative Sharp comparisons for the six main plates, menu board, and celebrity event art; require dimensions, MAE, and PSNR thresholds.
- [ ] Run `npm test -- --run src/landscape/kitchen/runtimeAssetContract.test.ts` and confirm failure because the builder and manifest are absent.
- [ ] Implement recursive discovery, fixed encoding options, SHA-256 manifest entries, guarded runtime-only orphan removal, and read-only check mode.
- [ ] Run `node scripts/build-runtime-webp-assets.mjs --json` to generate all derivatives and the manifest.
- [ ] Run the focused contract and require it to pass.

### Task 2: Runtime WebP mapping

**Files:**
- Modify: `src/components/LandscapeGame.tsx`
- Modify: `src/landscape/campaign.ts`
- Modify: `src/landscape/kitchen/assets.ts`
- Modify: `src/landscape/kitchen/assets.test.ts`
- Modify: `src/components/game/KitchenScene.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/kitchenCompositionAsset.test.ts`
- Modify: `src/styles/referenceGameplayComposition.test.ts`

**Interfaces:**
- Consumes runtime paths mirroring `src/assets/approved` beneath `src/assets/runtime`.
- Preserves `customerEmotionArt`, `customerMotionAtlas`, `ingredientArt`, `ingredientFoodArt`, and `stageArt` signatures.

- [ ] Change resolver and component assertions from `.png` to `.webp` and require approved source metadata tests to remain unchanged.
- [ ] Run focused App, kitchen asset, kitchen scene, and visual contract tests and confirm the runtime extension assertions fail.
- [ ] Replace explicit screen, campaign dish, and ingredient-bin imports with runtime WebP paths.
- [ ] Point kitchen glob maps and key construction at runtime WebP paths.
- [ ] Add `fetchPriority="high"` to the active primary screen and kitchen background images.
- [ ] Run all focused tests and require them to pass.

### Task 3: Production transfer budget and complete-order QA

**Files:**
- Create: `scripts/capture-gameplay-ui-polish-v6.mjs`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v6/optimized-home-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v6/optimized-day1-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v6/optimized-delivery-1440x810.png`
- Create: `docs/qa/screenshots/gameplay-ui-polish-v6/qa-results.json`

**Interfaces:**
- Produces separate cold-home and home-to-active-Day-1 resource timing totals and named largest resources.

- [ ] Build production assets and start `vite preview` on a strict local port.
- [ ] Clear browser cache, campaign storage, and guided tutorial storage before navigation.
- [ ] Measure encoded resource bytes after the home plate loads and require at most 800KB.
- [ ] Clear resource timings, enter Day 1, wait for the first customer, and require additional transfer at most 3,500KB.
- [ ] Complete noodle, egg, hot dog, sauce, scallion, cut, roll, pack, and delivery actions.
- [ ] Require one completed order, persisted coins, delivery feedback, and zero console errors.
- [ ] Capture home, active Day 1, and delivery states and write exact timing evidence.
- [ ] Run `npm test -- --run`, `npm run build`, and `git diff --check`; commit QA evidence and confirm only preserved `output/` remains untracked.
