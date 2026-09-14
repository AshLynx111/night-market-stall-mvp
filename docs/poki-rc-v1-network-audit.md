# Poki RC V1 network audit — historical evidence

RC v1 is **OBSOLETE**, superseded by RC v2. The request classification below has been corrected for the final-blocker scope; historical probe records are preserved.

Source commit: `3d5d88ef9b2a6956048bcc463a9bd1f2f7440466`. Static game-bundle scan passed. No Google Analytics, Google Fonts, remote media, playtest endpoint, feedback link, AdSense, CrazyGames, third-party CSS/JS or telemetry endpoint is bundled. React error-documentation URLs and W3C namespace literals are inert strings, not observed requests. Both build variants retain separate adapter paths.

## Runtime scope and pending live classification

Local production SDK-mock tests: zero unexpected external requests, zero HTTP 404s, zero uncaught errors. The SDK URL is fulfilled by Playwright; this establishes what the **game bundle** requests and does not characterize the remote SDK's internal ad network.

Real official SDK, local preview: the first run requested the SDK loader/core, Poki-owned infrastructure, and Google IMA, DoubleClick GPT and Amazon ad dependencies. Non-allowlisted requests were recorded then blocked before network transmission. This guard also initially blocked Poki-owned auxiliary domains, producing the error records below. It was corrected for Poki-owned infrastructure, and the second run recorded just the loader/core, no errors, and playable Start/Pause/Resume. That differing result does not erase the first run's requests or prove a stable advertising-network allowlist.

**Poki SDK downstream ad requests: REQUIRES LIVE INSPECTOR CLASSIFICATION.** Google IMA, DoubleClick and Amazon requests originating in the official SDK advertising stack are not game-integrated third-party services and are not a code blocker. Their status is PENDING LIVE INSPECTOR, not PASS. No SDK filtering, proxying, blocking or monkey-patching was added to the game or release. The prior restrictive diagnostic harness is historical evidence and was not rerun for RC v2.

Source verification: the downloaded official core script contains all six observed host strings (Google IMA, DoubleClick, Amazon, Poki CDN, geo and ads). Core SHA-256: `f4d54f6561eb4ab49020327fd9ea1568208395ffcd053c31c65af71fcf32dde5`, 325,706 bytes. URL: `https://game-cdn.poki.com/scripts/d3037151c879132174772b68702ed80454d65114/poki-sdk-core-d3037151c879132174772b68702ed80454d65114.js`. This supports SDK origin; it does not establish a live Inspector pass. The first probe did not capture individual downstream CDP initiator stacks. CDP initiator evidence for the second probe is in `docs/qa/poki-rc-v1/real-sdk-local.json`.

Poki documents [platform-only ads](https://developers.poki.com/guide/requirements-quality), [SDK monetization through ad partners](https://developers.poki.com/guide/how-monetization-works), and [external resource approval](https://developers.poki.com/guide/external-resources-policy). These distinguish the SDK's advertising infrastructure from additional game-integrated ad systems; final environment classification is still pending.

## Real SDK observed request table

| Request | Domain | Reason | Allowed / Unexpected |
| --- | --- | --- | --- |
| `https://game-cdn.poki.com/scripts/v2/poki-sdk.js` | game-cdn.poki.com | Loaded by official SDK; not embedded in game JS | Allowed Poki infrastructure |
| `https://game-cdn.poki.com/scripts/d3037151c879132174772b68702ed80454d65114/poki-sdk-core-d3037151c879132174772b68702ed80454d65114.js` | game-cdn.poki.com | Loaded by official SDK; not embedded in game JS | Allowed Poki infrastructure |
| `https://a.poki-cdn.com/sdk/hourglass-icons-v2.svg` | a.poki-cdn.com | Loaded by official SDK; not embedded in game JS | Allowed Poki infrastructure |
| `https://a.poki-cdn.com/sdk/error-icons-v2.svg` | a.poki-cdn.com | Loaded by official SDK; not embedded in game JS | Allowed Poki infrastructure |
| `https://geo.poki.io/` | geo.poki.io | Loaded by official SDK; not embedded in game JS | Allowed Poki infrastructure |
| `https://ads.poki.com/ads/settings?loc=` | ads.poki.com | Loaded by official SDK; not embedded in game JS | Allowed Poki infrastructure |
| `https://securepubads.g.doubleclick.net/tag/js/gpt.js` | securepubads.g.doubleclick.net | Loaded by official SDK; not embedded in game JS | PENDING LIVE INSPECTOR (SDK-originated) |
| `https://imasdk.googleapis.com/js/sdkloader/ima3.js` | imasdk.googleapis.com | Loaded by official SDK; not embedded in game JS | PENDING LIVE INSPECTOR (SDK-originated) |
| `https://a.poki-cdn.com/prebid/prebid_1782721530.js` | a.poki-cdn.com | Loaded by official SDK; not embedded in game JS | Allowed Poki infrastructure |
| `https://c.amazon-adsystem.com/aax2/apstag.js` | c.amazon-adsystem.com | Loaded by official SDK; not embedded in game JS | PENDING LIVE INSPECTOR (SDK-originated) |

## Game-bundle runtime request table

Loopback origin is the local production host. Paths are normalized across test ports; raw per-case full URLs are preserved in the JSON evidence. Every row below was observed by the browser. A separate exhaustive HTTP check returned 200 for all 308 files under assets/.

| Request | Domain | Reason | Allowed / Unexpected |
| --- | --- | --- | --- |
| `/` | 127.0.0.1 | document | Allowed |
| `/?debug=1` | 127.0.0.1 | document | Allowed |
| `/?playtest=1` | 127.0.0.1 | document | Allowed |
| `/?playtest=1&debug=1&qa=1&pid=rc` | 127.0.0.1 | document | Allowed |
| `/?qa=1` | 127.0.0.1 | document | Allowed |
| `/assets/02-egg-raw-BOu8Xxb8.webp` | 127.0.0.1 | image | Allowed |
| `/assets/02-egg-raw-CDfSx52u.webp` | 127.0.0.1 | image | Allowed |
| `/assets/02-egg-ready-BraLD1aS.webp` | 127.0.0.1 | image | Allowed |
| `/assets/02-egg-ready-DsikBR-3.webp` | 127.0.0.1 | image | Allowed |
| `/assets/03-hot-dog-raw-DWrjIvep.webp` | 127.0.0.1 | image | Allowed |
| `/assets/03-hot-dog-ready-DaSH3Pnu.webp` | 127.0.0.1 | image | Allowed |
| `/assets/03-turkey-noodle-raw-Bek2gA98.webp` | 127.0.0.1 | image | Allowed |
| `/assets/03-turkey-noodle-ready-BTfhWzdp.webp` | 127.0.0.1 | image | Allowed |
| `/assets/04-second-egg-raw-rAp6Fky_.webp` | 127.0.0.1 | image | Allowed |
| `/assets/04-second-egg-ready-7JwzIDKl.webp` | 127.0.0.1 | image | Allowed |
| `/assets/04-tenderloin-raw-DeZV-9y2.webp` | 127.0.0.1 | image | Allowed |
| `/assets/04-tenderloin-ready-Cg4uNNUC.webp` | 127.0.0.1 | image | Allowed |
| `/assets/arriving-BBjmCuQ-.webp` | 127.0.0.1 | image | Allowed |
| `/assets/arriving-Bf-oueV1.webp` | 127.0.0.1 | image | Allowed |
| `/assets/arriving-BqMWkawi.webp` | 127.0.0.1 | image | Allowed |
| `/assets/arriving-CQEuN-Lo.webp` | 127.0.0.1 | image | Allowed |
| `/assets/arriving-CSdiH32M.webp` | 127.0.0.1 | image | Allowed |
| `/assets/arriving-DHz3mSVl.webp` | 127.0.0.1 | image | Allowed |
| `/assets/arriving-Pr1zWBAj.webp` | 127.0.0.1 | image | Allowed |
| `/assets/big-eater-03-second-noodle-QkRmGghR.webp` | 127.0.0.1 | image | Allowed |
| `/assets/big-eater-04-second-egg--bacon-DxbAkmXa.webp` | 127.0.0.1 | image | Allowed |
| `/assets/big-eater-05-sauce--bacon-C2ABR6V4.webp` | 127.0.0.1 | image | Allowed |
| `/assets/big-eater-06-scallion--bacon-CLzgSO7z.webp` | 127.0.0.1 | image | Allowed |
| `/assets/big-eater-07-cut--bacon-BfYx_zqI.webp` | 127.0.0.1 | image | Allowed |
| `/assets/big-eater-08-roll--bacon-CME0ZR0c.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-01-noodle-HVexiEkq.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-03-hot-dog--bacon-BkejrFsp.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-03-hot-dog--cilantro-BYsjltYt.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-03-hot-dog--enoki-DDtw3PP-.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-03-hot-dog-BNieS80Y.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-04-sauce--bacon-BZ1AE_kv.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-04-sauce--cilantro-DaYWmb88.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-04-sauce--enoki-SVwH832B.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-04-sauce-CxeiBv_Y.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-05-scallion--bacon-BViaPmS-.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-05-scallion--cilantro-zDyjo3T5.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-05-scallion--enoki-NmgGOZe4.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-05-scallion-CfMZ0Mgb.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-06-cut--bacon-D7E1yUYs.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-06-cut--cilantro-D0piW1_e.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-06-cut--enoki-D-kF8oaX.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-06-cut-ByiJub1y.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-07-roll--bacon-DOoLBBfr.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-07-roll--cilantro-C-D2D7Sa.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-07-roll--enoki-pvHPrqaw.webp` | 127.0.0.1 | image | Allowed |
| `/assets/classic-07-roll-DWMwIc2-.webp` | 127.0.0.1 | image | Allowed |
| `/assets/day-select-title-neutral-CSTi_koI.webp` | 127.0.0.1 | image | Allowed |
| `/assets/day-select-user-final-BP5n1raz.webp` | 127.0.0.1 | image | Allowed |
| `/assets/day5-celebrity-event-key-art-J6vjZalJ.webp` | 127.0.0.1 | image | Allowed |
| `/assets/dish-big-eater-noodle-BRDXDn3P.webp` | 127.0.0.1 | image | Allowed |
| `/assets/dish-classic-noodle-I9rRxPK7.webp` | 127.0.0.1 | image | Allowed |
| `/assets/dish-orleans-chicken-noodle-mVr_grqi.webp` | 127.0.0.1 | image | Allowed |
| `/assets/dish-signature-cheese-turkey-noodle-DFJhLo0W.webp` | 127.0.0.1 | image | Allowed |
| `/assets/dish-tenderloin-turkey-noodle-Guhzq8xw.webp` | 127.0.0.1 | image | Allowed |
| `/assets/happy-CjSn8naZ.webp` | 127.0.0.1 | image | Allowed |
| `/assets/happy-Csx4Qeto.webp` | 127.0.0.1 | image | Allowed |
| `/assets/happy-DOr4GDrn.webp` | 127.0.0.1 | image | Allowed |
| `/assets/happy-witbPK5d.webp` | 127.0.0.1 | image | Allowed |
| `/assets/home-screen-user-final-C8Xn3OJv.webp` | 127.0.0.1 | image | Allowed |
| `/assets/home-title-neutral-B-N6nKdN.webp` | 127.0.0.1 | image | Allowed |
| `/assets/impatient-ioHtOIA1.webp` | 127.0.0.1 | image | Allowed |
| `/assets/index-BJbZCAa7.js` | 127.0.0.1 | script | Allowed |
| `/assets/index-CQrd9IwC.js` | 127.0.0.1 | script | Allowed |
| `/assets/index-DqtorRTD.css` | 127.0.0.1 | stylesheet | Allowed |
| `/assets/ingredient-bacon-Bq6pfeAB.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-bin-sauce-BpqCx5eD.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-cheese-BK8gC_A4.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-chili-powder-CNVUFwMC.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-cilantro-mTnRXM7u.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-corn-OXYaPMvT.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-egg-BoDG0Gmq.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-enoki-D5vCxW6v.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-hot-dog-Dpx8_C6I.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-noodle-sheet-BZxyb-py.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-onion-BWe7JPxS.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-orleans-chicken-CO7bqeWM.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-sauce-BSdOzBjl.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-scallion-DvRe8lSY.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-tenderloin-DsMZUMns.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ingredient-turkey-noodle-D73RSOWN.webp` | 127.0.0.1 | image | Allowed |
| `/assets/kitchen-screen-live-clean-CQDJLIgK.webp` | 127.0.0.1 | image | Allowed |
| `/assets/kitchen-screen-live-expanded-clean-D993X-rQ.webp` | 127.0.0.1 | image | Allowed |
| `/assets/night-market-bgm-Dsrq8fsL.mp3` | 127.0.0.1 | media | Allowed |
| `/assets/night-market-clean-background-DRPGRpdO.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ordering-8D5bdyzm.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ordering-BDd9aoN7.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ordering-BnSfW2zy.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ordering-DAv8SzOo.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ordering-DM1-vGOO.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ordering-DvGLf4ys.webp` | 127.0.0.1 | image | Allowed |
| `/assets/ordering-RyFLFGpa.webp` | 127.0.0.1 | image | Allowed |
| `/assets/orleans-01-noodle-D00UY_G0.webp` | 127.0.0.1 | image | Allowed |
| `/assets/orleans-04-sauce--chili-powder-TCgDSC8f.webp` | 127.0.0.1 | image | Allowed |
| `/assets/orleans-06-cut--chili-powder-BfrJzAon.webp` | 127.0.0.1 | image | Allowed |
| `/assets/orleans-07-roll--chili-powder-bSxF4coI.webp` | 127.0.0.1 | image | Allowed |
| `/assets/poki-CNuId0eD.js` | 127.0.0.1 | script | Allowed |
| `/assets/settings-screen-user-final-CbSiQ8af.webp` | 127.0.0.1 | image | Allowed |
| `/assets/settings-slider-clean-patch-DevvtYq4.webp` | 127.0.0.1 | image | Allowed |
| `/assets/signature-04-cheese-9cYzboSr.webp` | 127.0.0.1 | image | Allowed |
| `/assets/signature-05-corn--chili-powder-BQzkWEqP.webp` | 127.0.0.1 | image | Allowed |
| `/assets/signature-05-corn-CKlqwVs_.webp` | 127.0.0.1 | image | Allowed |
| `/assets/summary-screen-user-final-Dj2uHf7I.webp` | 127.0.0.1 | image | Allowed |
| `/assets/summary-title-neutral-EyqjklnP.webp` | 127.0.0.1 | image | Allowed |
| `/assets/tenderloin-04-tenderloin--onion-RBuojEGP.webp` | 127.0.0.1 | image | Allowed |
| `/assets/tenderloin-05-sauce--onion-BbQyqPBu.webp` | 127.0.0.1 | image | Allowed |
| `/assets/tenderloin-06-scallion--onion-CoFvZg3y.webp` | 127.0.0.1 | image | Allowed |
| `/assets/tenderloin-07-cut--onion-aXyiNdh5.webp` | 127.0.0.1 | image | Allowed |
| `/assets/tenderloin-08-roll--onion-BVuOaOv6.webp` | 127.0.0.1 | image | Allowed |
| `/assets/waiting-7JwoTtRp.webp` | 127.0.0.1 | image | Allowed |
| `/assets/waiting-B-hb3jfs.webp` | 127.0.0.1 | image | Allowed |
| `/assets/waiting-Bl1ofHc3.webp` | 127.0.0.1 | image | Allowed |
| `/assets/waiting-BqF4RJIG.webp` | 127.0.0.1 | image | Allowed |
| `/assets/waiting-CmxHgmqm.webp` | 127.0.0.1 | image | Allowed |
| `/assets/waiting-DauAkCVG.webp` | 127.0.0.1 | image | Allowed |
| `/assets/waiting-DLcZRouC.webp` | 127.0.0.1 | image | Allowed |
| `https://game-cdn.poki.com/scripts/v2/poki-sdk.js` | game-cdn.poki.com | Poki SDK (mock) | Allowed |

## Console outcomes

- Normal mock runs: no console errors, page errors, unhandled rejection or HTTP error.
- Injected init rejection: `Poki SDK initialization failed; continuing without ads. Error: RC injected init reject`. Expected warning from the tested fallback; first order completes and input/audio unlock.
- Injected ad rejection: `Poki SDK commercialBreak failed; continuing gameplay. Error: RC injected break reject`. Expected warning from the tested fallback; gameplay resumes and first order completes.
- First real-SDK restrictive probe: browser `Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector` and two `Failed to fetch` page errors. These were caused by the audit harness's denied SDK dependency requests, are retained in `real-sdk-initial-guard.json`, and are **not claimed as a passing clean real-SDK run**.
- Second real-SDK probe: one informational `PokiSDK.measure(game, loading, start)` log, no errors or failed requests observed. This is SDK startup logging, not a game telemetry endpoint. Ads/partner paths were not observed in that run.
- There was no live Inspector session. Neither real-SDK localhost probe is a live Inspector certification.
