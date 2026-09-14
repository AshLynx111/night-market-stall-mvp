# Poki RC V2 — final blocker fix

**READY FOR POKI INSPECTOR.** Live Inspector is NOT RUN; this is not submission approval. Poki SDK downstream ad requests are **REQUIRES LIVE INSPECTOR CLASSIFICATION / PENDING LIVE INSPECTOR**, not a confirmed P0 or a game-code blocker.

## Release identity

| Item | Value |
| --- | --- |
| Branch | `codex/poki-submission-rc-v1` |
| Packaged source commit | `fb8df4fe9d7c16bf5986c80d4c829e66a69009a1` |
| Embedded build version | `poki-rc-v2+fb8df4fe9d7c` |
| ZIP | `D:/game_demo/night-market-poki-rc-v2.zip` |
| ZIP size | 26,000,446 bytes |
| ZIP SHA-256 | `8eb6d8cbd7b510b25281c093093344e72e00ea415b86c1fbdf482fe0443b0b1d` |
| Manifest | [poki-rc-v2-manifest.json](../releases/poki-rc-v2-manifest.json) |
| ZIP structure | `index.html` and `assets/` directly at root; 309 entries, each decompressed hash verified against production output |

The later packaging/documentation commit does not change the source identity above. Reproduce from that source commit with `npm ci`, `npm run build`, then `node scripts/build-poki-rc-v2.mjs`.

The retained `night-market-poki-rc-v1.zip` and its SHA-256 `988c2fb001094a826fd4d86ca90e356a1743d98efbd2f622d2904651662c4e77` are **OBSOLETE**. The old ZIP was not overwritten; its original checksum was rechecked.

## Changes

- At viewport widths up to 900px, only English `.summary-message` and `.summary-retention` containers use centered 60% width within the existing Summary paper panel. Copy, font size, line height, panel geometry, background and all controls remain unchanged. This retains the full evaluation wording without clipping or scaling.
- The existing Poki-only Vite HTML transform sets static language, title and description to English. Standalone source HTML and metadata remain Chinese. SDK script URL, attributes and lifecycle behavior remain unchanged.
- Release tooling adds RC v2 packaging, static metadata assertions, a focused production Summary test and separate game/SDK request attribution. Historical RC v1 reports now correct the SDK classification and mark the old candidate obsolete.

## Required validation

| Check | Result |
| --- | --- |
| `npm test` | PASS — 76 files, 410 tests |
| `npm run build` | PASS — standalone |
| `npm run build:poki` | PASS — including the packaged source identity |
| `npm run test:poki` | PASS — existing platform, lifecycle and mobile smoke checks; errors array empty |
| `node scripts/audit-platform-builds.mjs` | PASS — both metadata variants, production URL and integration scan |
| `node scripts/qa-poki-rc-v2-summary.mjs` | PASS — real production Poki output; four English containment checks, four Chinese baseline comparisons and English desktop baseline comparison |
| Game-originated unexpected external requests | **0** in final bundle scan and focused browser run |
| SDK downstream advertising | **PENDING LIVE INSPECTOR** |

Only the requested checks and focused Summary regression were run for this fix; the broad RC v1 audit was not repeated. Raw results and logs are in [RC v2 evidence](qa/poki-rc-v2/). The final Summary evidence records the production HTML hash and browser request URLs, tying it to the manifest's built assets.

## Summary containment

Values below are `scrollWidth/clientWidth` and `scrollHeight/clientHeight` in CSS pixels. DOM Range bounds are also inside each intended text region; neither text region clips text or overlaps statistics, upgrade buttons or action buttons. The mobile font remains its existing 10px size.

| English production screenshot | Evaluation W; H | Retention W; H |
| --- | --- | --- |
| [640×360](qa/poki-rc-v2/summary-640x360-en.png) | 384/384; 15/15 | 382/382; 12/12 |
| [836×470](qa/poki-rc-v2/summary-836x470-en.png) | 501/501; 20/20 | 499/499; 16/16 |
| [844×390](qa/poki-rc-v2/summary-844x390-en.png) | 416/416; 17/17 | 414/414; 13/13 |
| [1440×810](qa/poki-rc-v2/summary-1440x810-en.png) | 576/576; 35/35 | 545/545; 29/29 |

At 640×360 the full evaluation text is 359.875px wide inside a 383.78125px region. The former approximately 104px overrun is resolved.

English 1440×810 and Chinese at all four dimensions are pixel-identical with versus without the new English-only media rule in the same production page. This isolates the entire CSS change against the frozen baseline; no other Summary CSS was changed. The harness waits for two consecutive identical captures before comparison to avoid resize/repaint settling artifacts. Initial immediate captures produced transient differences; no product code was changed to address those test artifacts.

## Static metadata

| Field | Standalone | Poki |
| --- | --- | --- |
| HTML language | `zh-CN` | `en` |
| Title | 夜市大排档 | Night Market: Street Food Stall |
| Description | 夜市大排档——一款温暖有烟火气的烤冷面点击经营小游戏。 | Cook street food, serve customers, and grow your night market stall. |

Standalone metadata is asserted equal to the unchanged source `index.html`; Poki values are asserted before JavaScript initialization.

## Request origin classification

See [RC v2 network classification](poki-rc-v2-network-classification.md). The final game bundle contains no own Google Analytics, Google Fonts, AdSense, DoubleClick, Amazon ads, third-party telemetry or external assets/CDN integrations. Its only active external URL is the official SDK bootstrap. React error documentation and W3C namespace strings are inert.

The deterministic browser test replaces only the SDK entry with the existing lifecycle mock to isolate requests made by the production game. It does not establish a live ad-stack pass. No SDK downstream requests were filtered, proxied, blocked or monkey-patched during this fix, and no production SDK/ad logic was changed.

## Frozen scope

Compared with pre-fix commit `502a092e17d85919017887d462cb11bb44ca3f97`, production source changes are limited to the English Summary media rule in `src/landscape.css` and Poki metadata in `vite.config.ts`. All character/image/audio assets retain their previous manifest hashes.

Character assets modified: NO

Ingredient tray visuals modified: NO

HUD layout modified: NO

Gameplay logic modified: NO

Gameplay balance modified: NO

Campaign/progression modified: NO

Save schema modified: NO

Poki lifecycle modified: NO

Griddle, recipes, economy, tutorial, commercial-break placement, audio suspend, input lock, Home, Settings and Day Select are unchanged.

## Manual handoff

Use the [Inspector checklist](poki-inspector-checklist.md) with the RC v2 ZIP and checksum. Live Inspector and physical Mobile Safari remain NOT RUN. No Poki login, upload or submission was performed, and main was not merged.
