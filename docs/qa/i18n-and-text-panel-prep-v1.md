# i18n and text panel preparation v1 — QA report

## Scope

- Added a minimal, typed `zh-CN` / `en` presentation layer.
- Kept Chinese as the default locale.
- Kept campaign, progression, recipes, economy, tutorial state, customer generation, and save schemas unchanged.
- Added semantic DOM/CSS hooks for text surfaces without redesigning the accepted screens.

## English preview

Run `npm run dev`, then open:

`http://localhost:5173/?lang=en`

Resolution order is `?lang=` → `localStorage['night-market-locale-v1']` → `zh-CN`.

## Automated and visual QA

| Page / state | zh-CN 1440×810 | en 1440×810 | zh-CN 844×390 | en 844×390 | Result |
|---|---:|---:|---:|---:|---|
| Home | captured | captured | captured | captured | PASS |
| Day Select | captured | captured | captured | captured | PASS |
| Day 1 Initial | captured | captured | captured | captured | PASS |
| Multiple Customers / Dual Griddle | captured | captured | captured | captured | PASS |
| Summary | captured | captured | captured | captured | PASS |
| Settings | captured | captured | captured | captured | PASS |

Automated browser checks across all 24 screenshots:

- horizontal overflow: 0
- vertical overflow: 0
- clipped critical elements: 0
- English visible DOM CJK matches: 0
- English `aria-label` / `title` / `alt` CJK matches: 0
- console errors: 0
- page errors: 0

The full machine-readable result is in `screenshots/i18n-and-text-panel-prep-v1/qa-results.json`.

## Contact sheets

- `screenshots/i18n-and-text-panel-prep-v1/contact-sheet-zh-CN-1440x810.png`
- `screenshots/i18n-and-text-panel-prep-v1/contact-sheet-en-1440x810.png`
- `screenshots/i18n-and-text-panel-prep-v1/contact-sheet-zh-CN-844x390.png`
- `screenshots/i18n-and-text-panel-prep-v1/contact-sheet-en-844x390.png`

## Verification

- `npm test -- --run`: 59 test files, 342 tests passed.
- `npm run build`: passed; this project has no separate `typecheck` script, and the build runs `tsc -b` before Vite.
- `npm run validate:art`: 428 art assets across 5 families validated.

## Deferred visual polish

- A later visual-only phase can replace the semantic `paper-panel`, `text-chip`, `order-bubble-panel`, `hud-label`, `stat-card`, `hint-panel`, and `settings-text-region` surfaces with a more elaborate parchment / wood / 2.5D skin.
- The baked Chinese brand and environmental signage remains part of the approved raster backgrounds. It was not regenerated in this phase.
- No layout redesign or broad panel art replacement was attempted.

Character assets modified: NO

Gameplay logic modified: NO

Campaign/progression modified: NO
