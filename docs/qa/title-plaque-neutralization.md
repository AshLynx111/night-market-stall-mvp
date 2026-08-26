# English Title Plaque Neutralization QA

Date: 2026-08-26
Branch: `codex/english-visual-polish-v1`

## Scope

This pass is limited to the four remaining English title regions: Home, Settings, Day Select, and Summary. It also changes the raw ingredient label from `Noodle Wrap` to `Noodle Sheet`.

Gameplay, Day Cards, order bubbles, tutorial UI, summary data, upgrades, buttons, characters, layout, campaign, and progression remain frozen.

## Before / After Evidence

| Page | Before | After | Text-off check |
| --- | --- | --- | --- |
| Home | `docs/qa/screenshots/english-visual-polish-v1/en-01-home-1440x810.png` | `docs/qa/screenshots/title-plaque-neutralization/after-home-1440x810.png` | PASS — removing the English text leaves the original ornate central plaque, with no rectangular overlay boundary. |
| Settings | `docs/qa/screenshots/english-visual-polish-v1/en-02-settings-1440x810.png` | `docs/qa/screenshots/title-plaque-neutralization/after-settings-1440x810.png` | PASS — the original frame, rope, trim, and plaque silhouette remain continuous. |
| Day Select | `docs/qa/screenshots/english-visual-polish-v1/en-03-select-1440x810.png` | `docs/qa/screenshots/title-plaque-neutralization/after-day-select-1440x810.png` | PASS — the English title sits inside the existing top plaque; no new rectangular board is visible. |
| Summary | `docs/qa/screenshots/english-visual-polish-v1/en-07-summary-1440x810.png` | `docs/qa/screenshots/title-plaque-neutralization/after-summary-1440x810.png` | PASS — the existing hanging gold-edged title seat remains the only visible plaque. |

## Implementation

- The four title containers are transparent and have no border or box shadow.
- English-only pseudo-elements place small locale-neutral texture patches inside the original plaque silhouettes.
- Each patch is feathered with a shape-following CSS mask, so no regular rectangular edge is exposed.
- Home and Settings reuse the same neutralized central-plaque patch.
- No full-screen replacement artwork is committed.

The neutral texture patches were produced with the built-in image generation precise-object-edit workflow. The prompts removed only the baked Chinese title lettering while preserving the surrounding plaque geometry, wood grain, gold trim, rope, ornament, lighting, and background. Only cropped, feathered WebP patches are stored in the project:

| Asset | Dimensions | Size |
| --- | ---: | ---: |
| `src/assets/locale/en/home-title-neutral.webp` | 720×195 | 32,692 bytes |
| `src/assets/locale/en/day-select-title-neutral.webp` | 460×185 | 19,448 bytes |
| `src/assets/locale/en/summary-title-neutral.webp` | 385×115 | 15,182 bytes |
| **Total** |  | **67,322 bytes** |

## Automated QA

`node scripts/capture-title-plaque-neutralization.mjs` generated exactly four English screenshots at 1440×810.

| Check | Result |
| --- | ---: |
| Pages captured | 4 |
| Console errors | 0 |
| Page errors | 0 |
| Horizontal overflow | 0 |
| Vertical overflow | 0 |
| Wrong locale / document language | 0 |
| Opaque title containers | 0 |
| Title borders or shadows | 0 |
| Missing neutral patch or mask | 0 |

Detailed results: `docs/qa/screenshots/title-plaque-neutralization/qa-results.json`.

## Verification

- `npm test -- --run`: PASS — 60 test files, 353 tests.
- `npm run build`: PASS — TypeScript and Vite production build, 458 modules transformed.
- Manual pasted-overlay review: PASS on all four pages.

## Frozen Boundaries

- Character assets modified: NO
- Gameplay logic modified: NO
- Campaign/progression modified: NO
- Other accepted gameplay and UI regions modified: NO
