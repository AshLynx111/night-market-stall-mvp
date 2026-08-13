# Kitchen Spatial Alignment Acceptance Report

## Release verdict

PASS. Microsoft Edge accepted the corrected kitchen composition at 1440 × 810 with the `spatial-alignment-v1` evidence schema. The run completed three real Day 1 orders through browser input, captured all five required screenshots, recorded zero console errors, zero page errors, and zero spatial-collision findings. No production defect was found and no production file was changed in Task 5.

## QA implementation and schema-first failure

- Updated `scripts/current-reference-screens-qa.mjs` to emit `artifacts/spatial-alignment-qa/result.json` and the five required captures.
- Added first-class records and hard assertions for ingredient visible crops, legacy/outer-rim indicators, exact ingredient IDs, rack collisions, griddle/stage centers, gesture/tutorial rectangles, settings controls, real gesture counts, real deliveries, and BGM continuity.
- Required RED check: before adding the new schema marker, `node scripts/current-reference-screens-qa.mjs` exited 1 with `Spatial-alignment result schema is absent`.
- The first post-schema browser attempt exposed a QA timing assumption: the runner tried to place order 3 before a new unbound customer arrived, and the product correctly rejected the premature drop. The runner was tightened to wait for an unbound order bubble. No product code changed.

## Regression gates

| Gate | Result | Exact total |
| --- | --- | --- |
| Focused `sceneGeometry`, `kitchen-layout`, `KitchenScene`, `App` | PASS | 4 files, 81 tests |
| `npm run validate:art` | PASS | 427 assets, 5 families |
| `npm test -- --run` | PASS | 38 files, 254 tests |
| `npm run build` | PASS | 420 modules transformed; 286 emitted files including `index.html` |
| `git diff --check` | PASS | exit 0 |
| Edge acceptance runner | PASS | 3 progression fixtures, 5 screenshots |

The build emitted 285 files under `dist/assets`: 1 JavaScript, 1 CSS, 282 PNG, and 1 MP3. Primary and spatially relevant bundle names are:

- `index-CNQJxWtF.js` — 324,860 bytes
- `index-BmRNf2rD.css` — 55,468 bytes
- `kitchen-screen-live-clean-DW0HVsRw.png` — 3,670,277 bytes
- `settings-screen-user-final-DbUjCS_m.png` — 3,158,600 bytes
- `settings-slider-clean-patch-y4vfjroj.png` — 64,297 bytes
- `night-market-bgm-Dsrq8fsL.mp3` — 2,401,307 bytes

## Exact progression fixtures

| Fixture | IDs | Count | Rack layout |
| --- | --- | ---: | --- |
| Day 1 | `noodle`, `egg`, `hot-dog`, `sauce`, `scallion` | 5 | `approved-2x3` |
| Day 3 | `noodle`, `egg`, `hot-dog`, `sauce`, `scallion`, `cilantro`, `onion`, `chili-powder`, `turkey-noodle`, `cheese`, `corn` | 11 | `expanded-3x5` |
| Day 5 | `noodle`, `egg`, `hot-dog`, `sauce`, `scallion`, `cilantro`, `onion`, `chili-powder`, `turkey-noodle`, `cheese`, `corn`, `orleans`, `bacon`, `tenderloin`, `enoki` | 15 | `expanded-3x5` |

Every fixture recorded:

- zero `.table-ingredient__bin-art` nodes;
- zero legacy vessel/content nodes or styled outer-rim indicators;
- exactly one overflow-hidden viewport and one food-art image per ingredient;
- positive visible food rectangles fully contained by their physical viewports;
- every 275–300% source crop extending beyond, and therefore being clipped by, its viewport;
- zero rack/rack, rack/griddle, rack/tutorial, and viewport-clipping collisions.

The approved 2 × 3 controls are 150 × 70 logical pixels at x = 80/235 and y = 466/541/616. The expanded 3 × 5 controls are 98 × 61 at x = 18/120/222 and y = 466/531/596/661/726. All measured controls remained within 1440 × 810.

## Griddle, stage, gesture, and tutorial geometry

| Slot | Griddle rect | Griddle center | Food/stage rect with both populated | Food/stage center | Stage delta |
| --- | --- | --- | --- | --- | --- |
| Left | x 491, y 559, 269 × 218 | (625.5, 668) | x 507, y 573, 237 × 190 | (625.5, 668) | (0, 0) px |
| Right | x 760, y 559, 269 × 218 | (894.5, 668) | x 776, y 573, 237 × 190 | (894.5, 668) | (0, 0) px |

The simultaneous Day 1 checkpoint contained one stage image on each griddle and zero cross-slot collisions. Guided cut and roll checkpoints measured both the gesture target and tutorial cue at x 491, y 559, 269 × 218, exactly matching the left griddle rect; x/y/width/height deltas were all 0. The sauce tutorial cue also measured the same exact rect. Thus both stage-center deltas are within the required ±2 logical pixels and all shared interaction geometry is exact.

## Settings acceptance

The settings DOM and live rendering recorded one localized 1672 × 941 RGBA cleanup patch, three range inputs, zero decorative thumbs, and three visible native thumbs.

| Range | Value | Effective CSS level | Rail rect | Live thumb center | Visible live thumbs |
| --- | ---: | ---: | --- | --- | ---: |
| 总音量 | 0 | 0% | x 645.859375, y 421.265625, 254.015625 × 12 | (659.859375, 427.265625) | 1 |
| 背景音乐音量 | 0.5 | 50% | x 645.859375, y 487.6875, 254.015625 × 12 | (772.8671875, 493.6875) | 1 |
| 音效音量 | 1 | 100% | x 645.859375, y 553.296875, 254.015625 × 12 | (885.875, 559.296875) | 1 |

Original-detail inspection confirms the left/center/right native thumbs are individually visible with no baked or decorative duplicate. The highlighted effects rail is the expected browser focus treatment on the last range filled by the QA journey.

## Real Day 1 journey and audio

- Completed deliveries 1, 2, and 3 with pointer/click/drag interactions and no state shortcut.
- Guided sauce stayed on `sauce` after the first stroke and advanced only after exactly two strokes: right, then left.
- Guided roll advanced to `pack` after exactly one rightward swipe.
- Orders 2 and 3 were bound to left and right griddles concurrently for the two-griddle acceptance capture, then finished and delivered normally.
- Seven BGM checkpoints retained the same single element identity `reference-bgm-1786638250812-0.20289518713496624` with strictly increasing times: 7.303524, 7.783678, 16.501467, 25.083313, 36.474853, 44.74717, and 45.168719 seconds.
- The explicit pause/retry continuity check advanced from 7.309951 to 7.32101 seconds; play attempts = 3.

## Screenshot evidence and original-detail inspection

All files are 1440 × 810 PNG captures from Microsoft Edge with device scale factor 1.

| Capture | Bytes | SHA-256 | Original-detail verdict |
| --- | ---: | --- | --- |
| `artifacts/spatial-alignment-qa/settings.png` | 1,920,906 | `e461b94faae2de82eb8e3884f21eb94a9292b7234f71a0c73fe36d18f26d3bd7` | Three clean live thumbs at min/mid/max; no duplicate thumb or damaged settings art. |
| `artifacts/spatial-alignment-qa/day-1-empty.png` | 1,652,749 | `cf9630661031eb93c58f8fe8d808fa01fdad5fcce60d1f26c9098bf3d4bb8fcd` | Five recognizable food crops stay inside the physical 2 × 3 rack windows; tutorial is clear of rack and griddles. |
| `artifacts/spatial-alignment-qa/day-1-two-griddles.png` | 1,686,628 | `9fe6218cbfa1d1cbccd1b4924257c14dbb6729664d92a79331cc1100d5e39958` | Both noodle stages are centered with matching safe insets and no cross-slot intrusion. |
| `artifacts/spatial-alignment-qa/day-3.png` | 1,704,058 | `b920c812e20da6ffa900285b1b62afa9a33faae7d25ed067d4e27c6ad421842d` | Exact 11 crops remain recognizable and contained in the expanded rack; no generated metal rim is visible. |
| `artifacts/spatial-alignment-qa/day-5.png` | 1,736,939 | `3ae6b641b7f2a8c581e93e413553bd60b3d02444d9616901c6813f94d2da05c0` | All 15 windows are filled cleanly through the final row, without rim leakage or overlap. |

Machine-readable evidence: `artifacts/spatial-alignment-qa/result.json` is 73,352 bytes with SHA-256 `02790b56954b71a97bb308e63ce7464250744384ac692aaae7d286a041a980dd`.

## Concerns

No release-blocking product concern remains. The only issue observed during Task 5 was the runner's initial customer-arrival race, which was corrected within the QA script by waiting for an unbound order. The final rerun, all regression gates, all automated assertions, and all five original-detail visual inspections are clean.

## Code-quality follow-up: measurable thumbs, mandatory interaction geometry, and exact output manifest

The review follow-up supersedes the original `spatial-alignment-v1` result details with `spatial-alignment-v2`. This remained QA-only; no production instrumentation, style, component, asset, or behavior changed.

### TDD evidence

- RED: `npm test -- --run scripts/spatial-alignment-qa-contract.test.mjs` failed before collection because `spatial-alignment-qa-contract.mjs` did not exist.
- GREEN: the initial contract suite passed 4/4 tests and the focused product plus QA run passed 5 files / 85 tests.
- The first Edge trial correctly rejected a narrow focus-ring edge as a possible second effects thumb. A synthetic focus-edge test was added RED (`expected 2 to be 1`) and then passed GREEN after the analyzer required a thumb-shaped run of at least 12 pixels and 150 changed pixels.
- Final contract suite: 1 file / 5 tests passed. It proves one thumb, a detectable second thumb, focus-edge exclusion, exact screenshot manifests/dimensions, schema versioning, measured thumb evidence, and mandatory sauce/cut/roll nodes.

### Sound live-thumb evidence

The runner no longer emits or asserts a hard-coded `nativeThumbCount`. For each range, it compares the saved live Edge screenshot against an immediate in-memory screenshot with only the three range inputs temporarily hidden. It scans the full rail width for connected changed-pixel runs that extend both above and below the 12px rail, excludes narrow focus-edge noise, requires exactly one thumb-shaped component, and requires that component center to be within 4px of the computed live value position.

| Range | Effective level | Measured visible thumb count | Pixel component | Measured x | Expected x | Absolute delta |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| 总音量 | 0% | 1 | width 24, 278 changed pixels | 661.5 | 659.859375 | 1.640625px |
| 背景音乐音量 | 50% | 1 | width 22, 271 changed pixels | 772.5 | 772.8671875 | 0.3671875px |
| 音效音量 | 100% | 1 | width 30, 405 changed pixels | 886.5 | 885.875 | 0.625px |

The synthetic duplicate test produces two measured components, so the acceptance cannot pass merely because three range elements exist.

### Mandatory active gesture geometry

The guided journey now records dedicated `guided-sauce-active`, `guided-cut-active`, and `guided-roll-active` checkpoints. Sauce is captured after selecting the sauce tool and before the first stroke. At all three checkpoints, the left gesture target and left tutorial cue are required to exist; absence throws immediately rather than being skipped. Every gesture and tutorial x/y/width/height delta against the griddle rect is exactly 0, and every stage-center delta remains (0, 0)px.

### Normalized exact output

Before every run, the runner validates the resolved target as exactly `artifacts/spatial-alignment-qa`, removes that directory, and recreates it. Before success it reads the output directory, requires exactly these five PNG names, and reads each file through Sharp to require PNG format and 1440 × 810 dimensions:

- `settings.png`
- `day-1-empty.png`
- `day-1-two-griddles.png`
- `day-3.png`
- `day-5.png`

The final v2 result is 80,634 bytes with SHA-256 `fdb60317e570ae98b6247fc0be745421af575ae9f99497c45c57546a184d618c`. Refreshed screenshot hashes are:

- `settings.png`: `e461b94faae2de82eb8e3884f21eb94a9292b7234f71a0c73fe36d18f26d3bd7`
- `day-1-empty.png`: `70f91ec84f09f6c51fdd6f06e7a38a5b1ecc771184a2bac3efca3345ef70d4aa`
- `day-1-two-griddles.png`: `aa546acb8ddd7e1137999f90b49382773281bec132356c52afc4b3060715a0f2`
- `day-3.png`: `7667269a3f9949afffb20a8570a354cd912a1da1615f2b166bb80ec08ea46861`
- `day-5.png`: `1ad927c072a25c9bc37062dd14de136e258a169947c083482437a4f6b3ee113a`

All five refreshed captures were inspected again at original detail and remain visually accepted.

### Final follow-up gates and concerns

- Focused: 5 files / 85 tests passed.
- Full: 39 files / 259 tests passed.
- Art validation: 427 assets across 5 families passed.
- Build: 420 modules transformed and completed successfully.
- Edge 1440 × 810: passed with three fixtures, three real deliveries, seven continuous BGM checkpoints, zero console/page errors, and zero collision findings.
- `git diff --check`: passed.

No product concern or production defect was found. The two failed Edge trials in this follow-up were both QA implementation issues (focus-edge classification and restoring temporarily hidden inputs through a visibility-filtering role locator); both have focused coverage or stable-selector correction, and the final complete rerun is green.
