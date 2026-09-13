# Poki Submission RC V1 Implementation Plan

**Goal:** Freeze the accepted game and deliver a traceable, audited ZIP for manual Poki Inspector testing.

**Architecture:** Keep runtime source and approved assets unchanged unless a verified P0 requires a minimal fix. Reuse existing production browser QA and add release-only audit scripts and documentation. Reuse VITE_BUILD_VERSION for release identity; record the full source commit and ZIP SHA-256 in a separate manifest.

**Tech Stack:** Vite, Vitest, Playwright/Edge, Node.js, PowerShell ZIP APIs.

## Global constraints

- Branch: codex/poki-submission-rc-v1, from latest codex/poki-platform-build-v1.
- No main merge, no portal login/upload/submit, no gameplay/visual/copy/save schema changes.
- Live Inspector and physical Mobile Safari remain unchecked until manually tested.
- Preserve existing untracked output/ and all tests.

## Execution checklist

- [x] Fetch baseline; verify HEAD matches remote; create requested branch.
- [ ] Run npm test, npm run build, npm run build:poki, npm run test:poki; preserve logs. Correct stale test assertions only with evidence from accepted source.
- [ ] Run scripts/qa-ingredient-tray-all-days.mjs and existing mobile QA.
- [ ] Add scripts/qa-poki-submission-rc-v1.mjs to cover fresh/returning users, query flags, storage failures, SDK failures, ad input/audio/timer freeze, missing viewports, touch drag, Day 5 lifecycle, network/console/404/performance.
- [ ] Audit dist-poki URLs, files, hashes, index, platform isolation, sizes and duplicate bytes with scripts/audit-platform-builds.mjs plus release inventory.
- [ ] Create docs/poki-inspector-checklist.md, docs/poki-submission-metadata.md, docs/poki-rc-v1-release-notes.md and docs/poki-rc-v1-qa-report.md with measured results and P0/P1/P2 issues.
- [ ] Commit release tooling/docs, rebuild with VITE_BUILD_VERSION=poki-rc-v1+<short SHA>; package index.html/assets directly at ZIP root.
- [ ] Save release manifest outside production ZIP with full source SHA, file inventory and SHA-256; verify extracted package matches build and loads.
- [ ] Commit evidence/docs as needed, verify frozen files against baseline, push requested RC branch, report exact packaged source commit separately from branch tip when different.
