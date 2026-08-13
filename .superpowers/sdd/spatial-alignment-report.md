# Kitchen Spatial Alignment Acceptance Report

## Release verdict

PASS. The expanded-rack correction satisfies the controller's physical-bin requirement. Day 1 retains the approved 2 × 3 steel rack; every later day with more than six unlocked ingredients selects a distinct, localized 3 × 5 physical-rack derivative. Microsoft Edge `151.0.4129.78` accepted the `spatial-alignment-v4` evidence at 1440 × 810 with the exact five PNG captures, three real Day 1 deliveries, dual-griddle use, two-stroke sauce, roll, settings, and BGM checks.

Original-detail inspection of `day-5.png` confirms all fifteen items are centered inside fifteen visible steel wells. `day-3.png` shows eleven occupied wells and four visibly empty steel wells. There are no loose icons, duplicate generated rims, griddle changes, or collateral HUD/composition changes.

## TDD and product correction

RED contracts first required a distinct later-day background, exactly fifteen measured physical controls, non-uniform perspective geometry, deterministic rebuild equality, and zero changed pixels outside the localized rack contour. The initial focused run produced four expected failures: missing background selection, missing expanded rebuild exports, and retained nominal geometry. Final focused and full suites are green.

Runtime background selection is based on `availableIngredients(day.day).length > 6` and is applied to both the base image and the counter foreground slice. `approved-2x3` remains unchanged. `expanded-3x5` uses fifteen explicit row-major controls and fifteen conservative floor polygons; shared uniform row/column arithmetic is no longer used for the perspective rack.

## Localized deterministic asset edit

The accepted built-in ImageGen source is tracked at `src/assets/art-source/kitchen-expanded-rack-imagegen-source.png` (2,331,003 bytes, 1672 × 941 RGB, SHA-256 `5b8b82f7894e884d6c082fed324ea6ec33e4c9523ca08839ab69ac9c0035644f`). Prompt intent and provenance are recorded beside it in `kitchen-expanded-rack-imagegen-prompt.md`.

`scripts/art-remake/build-live-kitchen-plate.mjs` starts from the deterministic Day 1 plate and takes pixels from the accepted source only through this 11-point source-space rack contour:

`(12,856) (22,772) (167,545) (190,539) (351,540) (462,542) (484,549) (443,774) (416,859) (390,875) (33,867)`

The contour uses a 2-pixel feather. Its live maximum x is 416.84, leaving 74.16 logical pixels before the left griddle at x 491. The expanded output `src/assets/approved/main-ui/kitchen-screen-live-expanded-clean.png` is 3,688,791 bytes with SHA-256 `2536f655101dcd6b60978d5c12788c234cdd98c68e663af4b59f345590d262c8`.

Rebuild tests prove byte-for-byte equality and more than 30,000 materially changed rack pixels with exactly zero changed pixels outside the contour. Original-detail comparison confirms the HUD, market, counter outside the rack, utensils, and both griddles remain on the approved plate.

## Canonical physical-well geometry

Day 1 keeps its six uniform 150 × 70 hitboxes and existing six floor masks. The expanded rack uses these measured live control envelopes by row (left, top, width, height):

| Row | Column 1 | Column 2 | Column 3 |
| --- | --- | --- | --- |
| 1 | 113.68, 469.13, 116.27, 53.37 | 229.95, 469.13, 88.71, 53.37 | 318.66, 469.13, 94.74, 53.37 |
| 2 | 86.99, 522.50, 122.29, 49.06 | 209.28, 522.50, 93.01, 49.06 | 302.30, 522.50, 99.04, 49.06 |
| 3 | 62.01, 571.56, 126.60, 55.95 | 188.61, 571.56, 98.18, 55.95 | 286.79, 571.56, 105.07, 55.95 |
| 4 | 36.17, 627.51, 130.91, 61.12 | 167.08, 627.51, 101.62, 61.12 | 268.71, 627.51, 111.96, 61.12 |
| 5 | 10.33, 688.63, 135.22, 68.00 | 145.55, 688.63, 108.52, 68.00 | 254.07, 688.63, 115.41, 68.00 |

All controls are pairwise disjoint, every floor polygon is strictly inside its matching control, all controls remain inside 1440 × 810, and the closest rack edge remains clear of both griddles. Each `TableIngredient` receives per-cell left/top/width/height and a control-local clip derived from the same canonical absolute polygon exposed to QA.

## Matching-background pixel acceptance

The Edge runner hides only stationary food, so each paired baseline retains the currently selected empty physical background: the 2 × 3 plate for Day 1 and the 3 × 5 plate for Day 3/5. RGB changes use threshold 18 and must stay inside the active well-floor polygons. Rim/control space, unused wells, and pixels outside all active masks must stay zero.

| Fixture | Physical wells | Active items | Changed pixels | Outside | Rim | Unused | 1px edge |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Day 1, `approved-2x3` | 6 | 5 | 6,377 | 0 | 0 | 0 | 0 |
| Day 3, `expanded-3x5` | 15 | 11 | 2,727 | 0 | 0 | 0 | 0 |
| Day 5, `expanded-3x5` | 15 | 15 | 3,937 | 0 | 0 | 0 | 0 |
| Active noodle drag | 1 | 1 | 2,503 | 0 | 0 | 0 | 0 |

Every active mask has a non-zero food delta. Day 1's sixth well and Day 3's four unused wells stay unchanged. The active drag remains one nested food-only image with no direct complete-bin source and zero leakage.

## Preserved interactions and portable runner

- Three Day 1 orders were delivered through real interactions; orders two and three occupied left and right griddles simultaneously with exact stage-center deltas `(0,0)`.
- Sauce required exactly two strokes, right then left; roll required one rightward swipe.
- Active sauce, cut, and roll gesture/tutorial bounds remain x 491, y 559, 269 × 218 with zero deltas.
- Seven BGM checkpoints retained one audio identity and increasing playback time; mixed volume is 0.31, mute is 0, and paused-singleton resume advanced 7.305230 → 7.321487 seconds.
- Settings measured exactly one native thumb at min/mid/max. Measured centers were 661.5, 772.5, and 886.5.
- The QA runner imports pinned project `playwright@1.62.1`; no user-cache module path is used.

## Regression gates

| Gate | Result | Exact result |
| --- | --- | --- |
| Critical focused trio | PASS | 3 files, 34 tests |
| Expanded QA/schema focus | PASS | 3 files, 60 tests |
| `npm run validate:art` | PASS | 428 assets, 5 families |
| `npm test -- --run` | PASS | 39 files, 274 tests |
| `npm run build` | PASS | 439 modules transformed |
| `git diff --check` | PASS | exit 0 |
| Edge v4 acceptance | PASS | 3 fixtures, 3 deliveries, exact 5 screenshots |

Production emits both `kitchen-screen-live-clean-DGrbZUtB.png` (Day 1) and `kitchen-screen-live-expanded-clean-BRP2QaYo.png` (later days).

## Exact screenshot evidence

All captures are Microsoft Edge PNGs at 1440 × 810 and device scale factor 1.

| Capture | Bytes | SHA-256 | Original-detail verdict |
| --- | ---: | --- | --- |
| `settings.png` | 1,920,913 | `2d9718f8a910a84fe003a085b8e3618e1d78060e97c4c76920fdaed475ea6372` | One visible native thumb per rail; no duplicate. |
| `day-1-empty.png` | 1,626,923 | `a815956dfd08f04c03cf5f2705f0d95c0004d7b956ecf3916181444c6f8ca8ce` | Five items remain in the approved 2 × 3 steel rack. |
| `day-1-two-griddles.png` | 1,652,947 | `34bd7ec8f9ccddbd669036837ab914b0a67ae14c35b9396eed13c66b9249567f` | Both cooking stages centered and isolated. |
| `day-3.png` | 1,679,672 | `51e31cd0d5960ad394544451ebab7303e2143a94c0f88c9777b550e42e75245b` | Eleven items each occupy a visible steel well; four empty wells remain. |
| `day-5.png` | 1,682,291 | `ef3e6b8b45a27373c6fd4cd25b5b75992a4f2ebd683e901a0d273f1cf4171ffe` | All fifteen items occupy fifteen distinct visible physical steel wells; no loose icons. |

Machine evidence: `artifacts/spatial-alignment-qa/result.json`, 126,356 bytes, SHA-256 `f13f933feb9dac0df32ea90283b0aafb8e9548ffba7845cddf7b49a94ab3a6f0`.

## Portability and concerns

Fresh clone `D:\game_demo_cleanclone_expanded` at implementation commit `4cf4425f354834a5f06daa01aa376a55da17204e` proved the portable path without the original checkout's dependencies: `npm ci` installed 118 packages from the lockfile; focused rebuild/schema/product tests passed 4 files / 45 tests; production build transformed 439 modules; and the complete Edge v4 runner passed all three fixtures, three deliveries, matching-background pixel analysis, and exact five screenshots on Edge `151.0.4129.78`. The deterministic Day 3 and Day 5 PNG hashes exactly match the primary run.

No release-blocking product or visual concern remains. The generated source is retained only for provenance and localized rebuilding; it is never shipped or selected as a whole-screen replacement.

Independent final review: Spec Compliance PASS and Code Quality PASS, with 0 Critical and 0 Important findings. The reviewer inspected Day 3/5 at original detail and explicitly confirmed Day 5 at 15/15 ingredients in distinct physical steel wells. Its two minor hardening notes were closed in the report commit: clean-clone wording was finalized and the full fifteen-control coordinate table is now pinned by test.
