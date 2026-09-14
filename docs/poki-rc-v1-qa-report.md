# Poki Submission Release Candidate V1 — technical QA

**RC v1: OBSOLETE; superseded by [RC v2](poki-rc-v2-qa-report.md).** The original measurements below describe v1. The former SDK P0 classification is corrected: official SDK downstream ad requests are REQUIRES LIVE INSPECTOR CLASSIFICATION, not a game-code blocker. Live Inspector and physical Mobile Safari remain NOT RUN.

## Identity and artifacts

| Item | Result |
| --- | --- |
| RC branch | codex/poki-submission-rc-v1 |
| Packaged source commit | `3d5d88ef9b2a6956048bcc463a9bd1f2f7440466` |
| Frozen runtime baseline | `5848d84013af3c81fbe502d3d0c8500fb795e0bf` |
| Runtime build identity | `poki-rc-v1+3d5d88ef9b2a` through existing VITE_BUILD_VERSION |
| ZIP | D:/game_demo/night-market-poki-rc-v1.zip |
| ZIP bytes | 26,000,472 (26.000 MB; 24.796 MiB) |
| ZIP SHA-256 | `988c2fb001094a826fd4d86ca90e356a1743d98efbd2f622d2904651662c4e77` |
| dist-poki size | 26,388,572 bytes (26.389 MB) |
| ZIP structure | index.html and assets/ at root, 309 files, each decompressed entry SHA-256 matches dist-poki |
| Manifest | releases/poki-rc-v1-manifest.json; full source SHA, every file SHA/size and final ZIP hash |
| Extracted ZIP check | PASS; root default English, trusted touch first order, embedded identity verified |

The packaged commit is deliberately distinguished from any later documentation/evidence-only branch tip. Reproduce by checking out that source commit and running `npm ci`, `npm run build`, then `node scripts/build-poki-rc-v1.mjs`. ZIP entries use fixed timestamps. No merge to main or portal operation is part of the release.

## Required commands and automated checks

| Check | Result / scope |
| --- | --- |
| npm test | PASS: 76 files, 410 tests; initial two stale rack assertions corrected, no tests removed |
| npm run build | PASS, standalone dist/ |
| npm run build:poki | PASS, final identity injected into dist-poki/ |
| npm run test:poki | PASS: original lifecycle, desktop, mobile HUD, locale and storage smoke suite |
| node scripts/qa-ingredient-tray-all-days.mjs | PASS: 44 captures, Days 1–6, dual griddles, guided tutorial and Day 5 event return; baseline geometry drift 0 |
| Existing mobile QA | PASS within test:poki: touch orders, repeat Pause/Sound, viewport resize, Summary containment and HUD |
| Extended RC cases | 33/33 PASS after harness corrections; final identity run complete |
| Static isolation/network/package scan | PASS; standalone no SDK strings; Poki SDK URL exactly once; no debug chunk, source maps, remote game assets or QA files |
| All production assets HTTP | 308 asset URLs returned 200; runtime Day 1–6 HTTP 404 = 0 |

Initial harness failures remain recorded in `qa-results-initial.json`: touch drag attempted before the next active customer, an unavailable gesture-only DOM selector was used during the ingredient stage, and the returning-user test used an incorrect button accessible name. Corrections waited for the real customer and addressed existing controls. Targeted successful reruns and final full-run evidence are retained. Game runtime was not changed to obtain a pass.

## Lifecycle and failure behavior

- Load: page → platform initialize → gameLoadingFinished once → Home → Start → Day 1 → gameplayStart. First Start has no ad. Unit tests additionally exercise a Start intent before loading finishes.
- Pause/Resume: gameplayStop → commercialBreak:start → promise resolves → commercialBreak:end → gameplayStart. Repeated cycles produce one event per edge.
- Day completion: Summary ends on gameplayStop. Next Day runs break → next day → gameplayStart. Play Again runs break → same day → gameplayStart at all five desktop sizes.
- Day 5: four orders completed through UI → event → gameplayStop → Coming right up! → gameplayStart, celebrity customer active. No extra commercial break was added.
- Ads: active cooking/patience/heat snapshot stayed identical for an ad held over 2.2 seconds while touch, drag, mouse and keyboard input were attempted. A separate ready-to-serve tray stayed unserved for 2.2 seconds. Input, patience and serving resumed after resolution. An additional test against the extracted ZIP verified a live sauce gesture: strokes 0 before/during a 2.2-second ad, then 1 after the same gesture following unlock (extracted-live-gesture-lock.json).
- Audio: observed music volume 0.28 → forced volume 0 and muted → original 0.28/unmuted; saved master/music/effects/mute values remained unchanged. Existing audio unit tests verify cooking effect loops and future cues stop and no new effect starts while suspended, then resume.
- SDK: init reject, commercialBreak reject, no-ad resolution, missing SDK and delayed availability all allowed first-order completion; no permanent pause/mute/input lock. Missing SDK exercises the existing three-second fail-open timeout.
- Storage: getItem throw, setItem throw, sessionStorage getter unavailable and combined denial each completed Home → Start → Day 1 → full first order. Persistence is not promised when storage is denied.

## Desktop, mobile, language and saves

Desktop: 1440×810, 1280×720, 1031×580, 836×470, 640×360. Gameplay has no document scrollbars; HUD regions do not overlap and customers, bubbles, trays and both griddles remain present. Every size completed three orders, displayed Summary and restarted through the ad promise. Summary cash, upgrade copy and controls stay inside their cards; **the separate praise sentence overflows its own text surface** (P1 below).

Touch: 844×390, 836×470, 640×360. Full first order uses actual touch taps and CDP touch gestures for sauce/cut/roll/pack/serve. Ingredient drag starts another valid order. Sound and Pause are exercised repeatedly. These are Chromium device emulations, not physical phone tests.

Day 1–6: correct tray ingredient counts 5 / 8 / 11 / 13 / 15 / 15; corresponding order bubbles and recipes present; one order completed in every day; no console errors. All-days screenshots were visually reviewed in a contact sheet. No accepted food positioning or character art was changed.

Fresh root: empty localStorage/sessionStorage, no query parameter, English Home and full first order. Returning: existing six-day campaign with coins, bestStars, fireLevel=1 and signLevel=1 retained exactly across a new same-origin page load; Continue opens Day 6, Day Select remains accessible and locale resolves to English despite stored Chinese.

Visible dynamic DOM checked for Chinese text in Home, Settings, Day Select, Gameplay, Tutorial, order/ingredient labels, Pause, Summary/upgrades, Day 5 event and Rotate: none found in the tested cases. Decorative painted signs remain unchanged. Initial static HTML metadata is still Chinese before locale initialization (P2).

Accessibility: Start via Enter, Pause via Escape, Resume via Space; dialog focus enters the menu and existing aria-labels resolve to their English control names. Mouse/touch navigation and these existing keyboard controls work in both builds.

Standalone isolation: no Poki SDK request/global during Start → Pause → Resume → full Day 1 → Next Day. `?lang=en&playtest=1&debug=1` still opens the standalone test panel. The original analytics sinks and standalone behavior were not changed.

## Network, console and performance

See [network audit](poki-rc-v1-network-audit.md) for Request / Domain / Reason / Allowed–Unexpected tables and exact SDK warnings/errors. Game-owned runtime traffic is local assets plus the official SDK entry. Mock coverage cannot prove the remote SDK's downstream network behavior. Real SDK partner requests are PENDING LIVE INSPECTOR and are not a game-code blocker.

Local cold-context sample, Windows Edge on loopback (not an Internet/mobile benchmark): navigation load 109.9 ms; loadingFinished 160.6 ms; Home observed by 699.8 ms after network-idle wait; initial resource transferred bytes 718,945 plus 1235 bytes for the HTML navigation. Home is the first meaningful UI; screenshot/DOM observation is an upper bound, not a measured FMP metric. No indefinite loading, asset blocking for tens of seconds or prolonged unresponsive main thread was observed in the local game runs. Real CDN latency and physical Safari performance require Inspector/device verification.

## Asset inventory and entry audit

- Initial JS: `assets/index-CQrd9IwC.js`, 409,563 bytes; locally computed gzip 115,618 bytes.
- Initial CSS: `assets/index-DqtorRTD.css`, 92,591 bytes; locally computed gzip 20,895 bytes.
- Images: 304 WebP files, 23,483,256 bytes. Audio: one MP3, 2,401,307 bytes. Effects use browser synthesis.
- Identical-byte duplicate file groups: 0. No unusually large accidental/source asset identified; largest file is the existing 2.401 MB soundtrack. No compression or art changes were made.
- Vite hashed JS/CSS/image/audio names retained. index.html uses relative ./assets paths, correct viewport-fit=cover, official async SDK exactly once, no localhost address, no GitHub Pages base path, no standalone analytics/ad script.
- ZIP excludes .map, docs/, screenshots/, qa-results.json, tests, source TS, scripts/, node_modules/, Git metadata and release manifests. Release manifest/checksum stay beside the archive, outside it.

| Largest assets | Bytes |
| --- | ---: |
| assets/night-market-bgm-Dsrq8fsL.mp3 | 2,401,307 |
| assets/customer-01-xiaolin-motion-DfLDdTo-.webp | 673,990 |
| assets/customer-05-suqing-motion-DLl68b3W.webp | 647,094 |
| assets/customer-08-azhe-motion-CrsrzKem.webp | 635,478 |
| assets/customer-09-teacher-chen-motion-oVa779GF.webp | 581,436 |
| assets/customer-03-xiaoyu-motion-ixuTHFJ5.webp | 571,592 |
| assets/customer-10-grandma-wang-motion-CctIvIrs.webp | 548,412 |
| assets/home-screen-user-final-C8Xn3OJv.webp | 547,320 |
| assets/settings-screen-user-final-CbSiQ8af.webp | 526,604 |
| assets/customer-07-xuyan-motion-DtG34uis.webp | 514,626 |

## Severity report

| Severity | Finding | Disposition |
| --- | --- | --- |
| Pending live classification | Official remote SDK attempted Google IMA / DoubleClick GPT / Amazon dependencies on localhost. | REQUIRES LIVE INSPECTOR CLASSIFICATION; SDK-originated, not a game integration or code blocker. Historical attempts remain logged. |
| P1 | Day 1 Summary English praise text extends outside its own paper surface. At 640×360, text right=551.94px versus surface right=447.92px. | Pre-existing visual issue, recorded under freeze. No viewport scrollbar or blocked buttons; still strongly recommend resolving before submission in a separately authorized UI pass. |
| P2 | Static index.html starts with Chinese lang/title/description before the locale code updates metadata. | Existing behavior; root rendered gameplay UI is English. Recorded without editing frozen copy. |

No game crash, build failure, missing asset, storage deadlock, SDK-mock lifecycle error or broken core input remains observed. This statement does not certify the SDK downstream advertising stack; live Inspector classification remains pending.

## Freeze verification

Character assets modified: NO

Core visual system modified: NO

Gameplay logic modified: NO

Gameplay balance modified: NO

Campaign/progression modified: NO

Save schema modified: NO

Ingredient tray visuals modified: NO

Git comparison against 5848d84 changes only release docs/tooling and two test files in src/. All runtime, styles, approved/runtime art, locale, campaign, save, lifecycle and ad placement source remains byte-for-byte unchanged.

## Manual handoff

- Inspector checklist: docs/poki-inspector-checklist.md — all live boxes unchecked.
- Metadata draft: docs/poki-submission-metadata.md.
- Release notes: docs/poki-rc-v1-release-notes.md.
- Evidence: docs/qa/poki-rc-v1/ including the original run, targeted corrections, final identity run, real-SDK probes and extracted ZIP smoke.
- Live Poki Inspector: NOT RUN. Physical Mobile Safari: NOT RUN. Portal login/upload/submit: NOT PERFORMED.

**RC v1 status: OBSOLETE.** Use the RC v2 report and checksum for the current Inspector candidate.
