# Poki RC V1 release notes

- Release: `poki-rc-v1`.
- Branch: `codex/poki-submission-rc-v1`.
- Frozen game baseline: `5848d84` from `codex/poki-platform-build-v1`.
- Packaged RC source commit: `3d5d88ef9b2a6956048bcc463a9bd1f2f7440466`. The full `sourceCommit` is recorded in `releases/poki-rc-v1-manifest.json`, generated from committed build inputs. The ZIP embeds `poki-rc-v1+<12-character source SHA>` through the existing `VITE_BUILD_VERSION` path. A later documentation/evidence-only commit can be the branch tip without changing the ZIP's source identity.
- Platform: Poki production web build, relative root entry, Vite hashed assets.
- Integrations: Poki adapter, SDK initialization/loading events, gameplay lifecycle, commercial breaks, temporary input/audio suspension, fail-open SDK handling.
- Devices/input: landscape desktop browsers and mobile touch layouts. Automated QA uses Windows Edge/Chromium with desktop and touch viewport emulation. Physical mobile Safari and live Inspector require the manual checklist.
- Campaign: Days 1–6, existing recipes, ingredient unlocks, progression and stall upgrades.
- Ads: no ad before initial Start. Pause stops gameplay; Resume requests a commercial break before restarting gameplay. Day completion stops gameplay; Next Day / Play Again request a break before continuing. Day 5 event interrupts and resumes gameplay lifecycle.
- Standalone: its separate build and original playtest path are preserved; no Poki SDK or monetization path is added.

## Changes in this release preparation

Release-only build/ZIP/checksum tooling, static and browser audit scripts, corrected tests for the already accepted ingredient-rack refactor, and submission/Inspector documentation. No gameplay, asset, copy, economy, progression, save schema or ad-placement changes.

## Verification and limitations

See `docs/poki-rc-v1-qa-report.md` for the measured test outcomes, severity list and network boundary. SDK mock runs and local real-SDK probes are distinct from a live Poki Inspector result. Real SDK advertising dependencies require explicit classification; do not interpret a mock's clean request list as proof that the remote SDK makes no additional requests.

The existing initial HTML metadata is Chinese before the locale code initializes; the tested Poki root gameplay UI resolves to English. Existing Summary message text can extend beyond its own paper text surface; this is recorded without changing the frozen UI.

No Poki login, game creation, upload or submission is performed by these release tools.

Current verdict: **NOT READY**. The network audit retains a P0 classification gate for real-SDK Google/Amazon ad dependencies, and the QA report records the existing Summary text overflow as P1.
