# Kitchen Spatial Alignment Acceptance Report

## Release verdict

PASS. The final coordinated fix wave satisfies the physical-bin, canonical-geometry, pixel-acceptance, and portability requirements. Microsoft Edge `151.0.4129.78` accepted the `spatial-alignment-v3` evidence at 1440 × 810. The run completed three real Day 1 orders, exercised sauce/cut/roll and both griddles, captured the exact five PNGs, and recorded zero console errors, page errors, or spatial collisions.

All five captures and both the accepted empty-bin source and final composite were inspected at original detail. Day 1 food sits inside the painted 2 × 3 rack; the Day 3/5 overflow rack uses transparent food-only silhouettes rather than rectangular generated-bin tiles; the active drag ghost is food-only; and no baked food remains in empty or unused cells. No protected customer, order, recipe, gesture, heat, unlock, price, audio, or screen-composition behavior changed.

## TDD and reviewer findings

The pre-fix RED suite reproduced all four Important findings:

- rack viewports equalled their full control rectangles and the drag ghost was a raw complete-bin image;
- child CSS rack variables shadowed `kitchenGeometryStyle()`;
- the runner used a tautological visible-image intersection and had no live-versus-baseline food analyzer;
- Playwright came from an absolute user cache, no project dependency was locked, and evidence omitted the Edge version.

GREEN coverage now proves positive-inset canonical inner polygons in both layouts and the ghost; no child geometry overrides; nested food-only rendering; synthetic accept/reject cases for mask, rim, unused-cell, outside-mask, and empty comparisons; exact evidence schema/manifest; a tracked ImageGen source with deterministic localized rebuilding; and exact `playwright@1.62.1` resolution through the package import.

The first food-only Edge rerun exposed a QA-only false delta: moving scene actors changed between the hidden-ghost and live-ghost frames. The paired capture now freezes animation only while acquiring those two in-memory frames, restores the live scene for the persisted screenshot, and passes the same polygon proof as stationary food.

## Localized deterministic asset edit

The accepted built-in ImageGen edit is tracked at `src/assets/art-source/kitchen-empty-bins-imagegen-source.png` (2,301,568 bytes, SHA-256 `ad36f73c4db3524da46c7e2dfac2847995ced82db46bba046bca61f0084d6673`). Its accepted original dimensions are 1668 × 943; the deterministic script resizes it to the approved 1672 × 941 plate coordinate space.

`scripts/art-remake/build-live-kitchen-plate.mjs` first rebuilds the existing customer/bubble cleanup, then composites the accepted source through exactly six feathered bin-floor polygons. It never replaces the whole background. The final `src/assets/approved/main-ui/kitchen-screen-live-clean.png` is 3,661,799 bytes with SHA-256 `78d8bb8d8d985a1a0c5d26291e17e121a65f12cac289ac7a62ce52be1bc4ab37`.

The rebuild test proves:

- byte-for-byte output equality from tracked inputs;
- all six interior masks receive material changes (more than 10,000 pixels total);
- exactly zero changed pixels outside the six polygons when compared with the customer-clean baseline.

Original-detail inspection confirms clean empty bin floors, retained steel rims/dividers, and no collateral HUD, counter, utensil, griddle, or background replacement.

## Canonical rack and food geometry

The full `.table-ingredient` remains the input hitbox. `sceneGeometry.ts` is now the sole source for controls, inner masks, griddles, gestures, tutorial paths, and the drag viewport; CSS consumes the published variables without shadowing them.

| Layout | Control | Inner rect | Inner polygon |
| --- | --- | --- | --- |
| `approved-2x3` | 150 × 70 | left 12, top 7, 126 × 52 | `9% 2%, 91% 2%, 99% 94%, 1% 94%` |
| `expanded-3x5` | 98 × 61 | left 7, top 6, 84 × 45 | `9% 2%, 91% 2%, 99% 94%, 1% 94%` |
| drag ghost | 112 × 70 | left 8, top 6, 96 × 54 | `9% 2%, 91% 2%, 99% 94%, 1% 94%` |

The tabletop now resolves the existing transparent `menu/ingredients` food assets. Complete generated-bin art remains available only where independently required by existing non-rack UI; neither stationary rack food nor the drag ghost renders it.

## Non-tautological pixel acceptance

For each Day 1/3/5 fixture, the Edge runner captures a frozen no-stationary-food baseline, restores food, and compares raw RGB pixels at threshold 18. Every changed pixel must be inside the canonical polygon. Rim/control-space pixels, unused cells, and pixels outside all allowed masks must remain zero. A one-pixel boundary distance is documented solely for clip antialiasing and is capped at 360 pixels per active mask.

| Fixture | Active food masks | Changed pixels | Outside | Rim | Unused | 1px antialias edge |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Day 1, `approved-2x3` | 5 | 7,542 | 0 | 0 | 0 | 0 |
| Day 3, `expanded-3x5` | 11 | 12,125 | 0 | 0 | 0 | 0 |
| Day 5, `expanded-3x5` | 15 | 16,303 | 0 | 0 | 0 | 2 |
| Active noodle drag ghost | 1 | 2,503 | 0 | 0 | 0 | 0 |

Every individual active mask contains a non-zero delta. Day 1's sixth unused physical cell and Day 3's four unused overflow cells record no change. The drag checkpoint additionally proves no direct image source on the ghost, exactly one nested food-art image, and all changed pixels inside the shaped ghost polygon.

## Preserved interaction and spatial evidence

- Three deliveries completed through real pointer/click/drag input; orders 2 and 3 occupied left and right griddles simultaneously.
- Sauce required exactly two strokes, right then left, for every order; roll required one rightward swipe.
- Active sauce, cut, and roll gesture/tutorial rectangles equal the left griddle at x 491, y 559, 269 × 218 with `(0, 0, 0, 0)` deltas.
- Populated griddle stage centers remain exact: left `(625.5, 668)`, right `(894.5, 668)`, both with `(0, 0)` stage-center deltas.
- Seven BGM checkpoints retained one audio-element identity with increasing playback time; mixed volume is 0.31, mute yields 0, and the pause/retry probe advanced from 7.294354 to 7.306826 seconds.
- Settings measured exactly one live native thumb at min/mid/max. Measured x positions are 661.5, 772.5, and 886.5 against expected 659.859375, 772.8671875, and 885.875.

## Regression gates

| Gate | Result | Exact result |
| --- | --- | --- |
| Focused product/QA | PASS | 6 files, 95 tests |
| Composite/rebuild | PASS | 2 files, 4 tests |
| `npm run validate:art` | PASS | 427 assets, 5 families |
| `npm test -- --run` | PASS | 39 files, 269 tests |
| `npm run build` | PASS | 438 modules transformed |
| `git diff --check` | PASS | exit 0 |
| Edge acceptance | PASS | 3 progression fixtures, active drag, 3 deliveries, 5 screenshots |

The production build emitted 303 files under `dist/assets`. Relevant outputs include:

- `index-Cb6Xl3o-.js` — 328,713 bytes
- `index-XdcW5NWu.css` — 56,280 bytes
- `kitchen-screen-live-clean-DGrbZUtB.png` — 3,661,799 bytes
- `settings-slider-clean-patch-y4vfjroj.png` — 64,297 bytes
- `night-market-bgm-Dsrq8fsL.mp3` — 2,401,307 bytes

## Screenshot evidence

All captures are 1440 × 810 PNGs from Microsoft Edge at device scale factor 1 and were inspected at original detail.

| Capture | Bytes | SHA-256 | Visual verdict |
| --- | ---: | --- | --- |
| `settings.png` | 1,920,906 | `e461b94faae2de82eb8e3884f21eb94a9292b7234f71a0c73fe36d18f26d3bd7` | One clean thumb at each min/mid/max rail; no duplicate. |
| `day-1-empty.png` | 1,627,814 | `336d33e9811578b02f05a87be49a04aaf98663cd27331ba8fa8fecf0ba07f3ac` | Five food-only silhouettes seated in the real 2 × 3 bins; active noodle ghost is food-only; live customer/tutorial context restored. |
| `day-1-two-griddles.png` | 1,653,890 | `3e7c864bb17caca7cfb627be3124b5830db35f61cefebc7630f6eaf30b07e088` | Both stages centered with matching insets and no cross-slot intrusion. |
| `day-3.png` | 1,668,819 | `cc2d2963f8970ed4d1e0cd5b3dff51c25d56560bb513f54ce5980d03a58453a6` | Eleven transparent shapes in the compact overflow rack; no hard rectangular tiles or generated metal rims. |
| `day-5.png` | 1,677,851 | `36398a1e045c1a66b5123a853c74a35d9a984e903c640c3b8ebc8612e9bb8164` | All fifteen shapes are readable, disjoint, and clear of griddles/tutorial/HUD. |

Machine-readable evidence: `artifacts/spatial-alignment-qa/result.json`, 109,933 bytes, SHA-256 `c90dbb5206d28816667d964e401b592b5bfff3ad225b76240b4cc81ddbf97d10`.

## Portability and remaining concerns

The runner imports `chromium` from project package `playwright`; `package.json` and `package-lock.json` pin `1.62.1`. A clean-clone install/rebuild/Edge result is recorded after the implementation commit in the final handoff.

No release-blocking product or visual concern remains. The expanded Day 3/5 rack is intentionally a compact 3 × 5 overflow presentation rather than a literal redraw of six steel bins, but its controls and food are canonical, readable, non-overlapping, masked, and pixel-confined. The only accepted non-zero tolerance is the two Day 5 pixels within one physical pixel of a polygon edge; the allowance and cap are explicit in evidence.
