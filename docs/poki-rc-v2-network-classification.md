# Poki RC V2 — request origin classification

**Game-originated unexpected external requests: 0.**

**Poki SDK downstream ad requests: REQUIRES LIVE INSPECTOR CLASSIFICATION / PENDING LIVE INSPECTOR.** They are not a game-code blocker and have not been marked PASS.

## A. Game-originated requests

Evidence: [final Summary run](qa/poki-rc-v2/summary-results.json), including complete request URLs and CDP initiators; [build/package scan](qa/poki-rc-v2/package-build.log). Production origin in the focused test is `http://127.0.0.1:4196`.

| Request | Initiator / reason | Classification |
| --- | --- | --- |
| `/`, `/?lang=zh-CN` | Browser navigation, CDP `other` | Same-origin game document |
| `/assets/index-DkHXmILs.js`, `/assets/index-BjkbSYiU.css` | HTML parser at the local production document | Same-origin game JS/CSS |
| `/assets/poki-CNuId0eD.js` | Script stack in bundled entry JS; exact line/column in JSON | Same-origin platform adapter |
| Local `/assets/*.webp`, `/assets/*.mp3` | Image/media loads; CDP initiator varies and is recorded where provided | Same-origin game assets |
| `https://game-cdn.poki.com/scripts/v2/poki-sdk.js` | HTML parser at the local production document | Expected official SDK bootstrap; entry mocked only in deterministic QA |

The bootstrap is an explicit game integration with the official SDK; downstream requests belong to category B. The final static scan finds no active external game URLs besides the official bootstrap, no game-owned Google Analytics/Fonts/AdSense/DoubleClick/Amazon/telemetry integration, and no external game assets or CDN. The source URL scan found only an inert W3C SVG namespace in an inline data image. Browser requests are additionally checked for unexpected nonlocal destinations. These checks cover the game bundle, not downloaded SDK internals.

## B. SDK-originated downstream requests

The following are preserved observations from the prior real-SDK local probe, not a newly run Inspector session. [RC v1 network evidence](poki-rc-v1-network-audit.md) contains full URLs and historical diagnostics. The previous restrictive probe is retained for provenance and was not rerun during this fix.

| Request / domain | Attribution evidence | Current status |
| --- | --- | --- |
| `game-cdn.poki.com/.../poki-sdk-core-*.js` | Official SDK loader; prior CDP stack recorded in `real-sdk-local.json` | Official SDK infrastructure; live environment pending |
| `securepubads.g.doubleclick.net/tag/js/gpt.js` | Prior SDK-path observation; domain in downloaded official core, absent from game bundle | PENDING LIVE INSPECTOR |
| `imasdk.googleapis.com/js/sdkloader/ima3.js` | Prior SDK-path observation; domain in downloaded official core, absent from game bundle | PENDING LIVE INSPECTOR |
| `c.amazon-adsystem.com/aax2/apstag.js` | Prior SDK-path observation; domain in downloaded official core, absent from game bundle | PENDING LIVE INSPECTOR |
| `a.poki-cdn.com/prebid/prebid_1782721530.js` | SDK advertising dependency observed in prior probe | PENDING LIVE INSPECTOR |
| `ads.poki.com/ads/settings?loc=`, `geo.poki.io/`, `a.poki-cdn.com/sdk/*-icons-v2.svg` | Prior SDK-path observations; corresponding host strings in official core | PENDING LIVE INSPECTOR |

The prior core has SHA-256 `f4d54f6561eb4ab49020327fd9ea1568208395ffcd053c31c65af71fcf32dde5`. Individual Google/Amazon initiator stacks were not captured in the first probe; attribution is supported by that probe's SDK execution path, the official core contents and their absence from the game bundle. No missing stacks are inferred or fabricated. Capture complete downstream initiators in the live Inspector session for final classification.

No SDK request filtering, proxying, blocking, monkey-patching or ad/lifecycle changes were introduced. Live Inspector remains NOT RUN.
