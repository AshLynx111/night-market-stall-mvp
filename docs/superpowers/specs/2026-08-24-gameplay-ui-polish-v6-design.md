# Gameplay UI Polish V6 Design

## Goal

Reduce first-screen and Day 1 network transfer by at least 75% while preserving the approved PNG masters, runtime dimensions, alpha edges, gameplay behavior, and visual identity.

## Baseline

Production measurements at 1440×810 with a cold browser cache:

- Home: 3,265KB total; `home-screen-user-final.png` is 3,156KB.
- Home to active Day 1: 7,547KB additional transfer.
- The production JavaScript is 94KB transferred and CSS is 15KB, so JavaScript splitting is not the primary bottleneck.
- The Day 1 transition includes the 2,345KB soundtrack, 2,738KB kitchen plate, five 229–366KB ingredient images, and current customer emotion images.

## Chosen approach

Keep `src/assets/approved` unchanged as the canonical lossless art package. Generate same-dimension WebP runtime derivatives under `src/assets/runtime`, then point application imports and asset resolvers at those derivatives.

The selected runtime source families are:

- `main-ui`
- `menu`
- `events`
- `customers/emotions`
- `customers/motion`
- `stages`

An in-memory trial across all 427 candidate PNGs reduced 167.9MB to 28.9MB at WebP quality 92, alpha quality 100, smart subsampling, and effort 5: an 83% reduction.

Alternatives rejected:

- JavaScript-only splitting targets less than 3% of the home transfer.
- Preloading moves downloads earlier but does not reduce bytes.
- AVIF is smaller but has a narrower compatibility floor and slower encoding/decoding on older mobile devices.
- Replacing the approved PNG files would weaken the existing art contracts and make future derivatives harder to reproduce.

## Deterministic derivative builder

- `scripts/build-runtime-webp-assets.mjs` recursively discovers target PNG masters.
- Each derivative keeps the source-relative path and changes only the extension to `.webp` under `src/assets/runtime`.
- Encoding options are fixed in source: quality 92, alpha quality 100, smart subsampling enabled, effort 5.
- The script writes `src/assets/runtime/manifest.json` with source path, runtime path, source SHA-256, dimensions, source bytes, and runtime bytes.
- Normal mode creates or refreshes derivatives and removes only orphaned files inside `src/assets/runtime`.
- `--check --json` performs no writes and fails for missing, stale, orphaned, or manifest-mismatched derivatives.
- The approved source tree is always read-only to the builder.

## Runtime asset mapping

- Screen plates, settings patch, menu board, event art, and takeaway bag use explicit runtime WebP imports.
- Campaign dish and ingredient-bin imports use runtime WebP.
- Kitchen customer, stage, and ingredient resolvers glob runtime WebP families and continue throwing for missing keys.
- Existing function signatures and logical asset dimensions remain unchanged.
- Current `<img>` and CSS URL behavior already downloads only assets referenced by the active screen and state; eager URL maps do not fetch every file.
- Primary screen and kitchen background images receive high fetch priority.

## Visual quality contract

- All derivatives must retain exact source width and height.
- Aggregate runtime bytes must be at most 25% of aggregate source bytes.
- The eight largest critical plates are decoded and compared against their PNG masters.
- Each critical plate must have mean absolute RGB error at most 3.0 and PSNR at least 35dB.
- Alpha channels remain lossless through `alphaQuality: 100`.

## Performance budgets and QA

- Cold home transfer at 1440×810: at most 800KB.
- Additional transfer from home to active Day 1, including soundtrack: at most 3,500KB.
- Complete the guided first order in a production preview after clearing campaign and tutorial storage.
- Require delivery feedback, one completed order, persisted coins, and zero console errors.
- Capture optimized home, active Day 1, and delivery screenshots.
- Run derivative contract checks, full Vitest, and production build.

## Error handling

- Missing or stale runtime assets fail tests and builds rather than silently falling back to a heavy or wrong image.
- Runtime lookup errors retain the existing useful missing-asset message.
- The browser continues using the original MP3 because audio conversion is outside this visual-asset phase and would require codec fallback work.

## Non-goals

- No visual redesign, source PNG deletion, audio transcoding, service worker, CDN configuration, gameplay changes, save migration, dependency additions, or quality reduction below the stated thresholds.
