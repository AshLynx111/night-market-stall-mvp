# Poki Startup Lifecycle Race Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure Poki always emits `gameLoadingFinished` before its first `gameplayStart`, while preserving the latest desired gameplay state and all standalone behavior.

**Architecture:** Add one readiness gate inside the existing serialized lifecycle `flush()`. The existing `loadingDesired`, `loadingSent`, `gameplayDesired`, and `gameplaySent` flags remain the only state; no React or adapter changes are needed.

**Tech Stack:** TypeScript, Vitest, Vite, Playwright, Poki mock SDK.

## Global Constraints

- Work only on `codex/poki-platform-build-v1`; do not merge main.
- Do not modify UI, characters, gameplay, ad placement, audio architecture, campaign, progression, or save schema.
- Do not block gameplay rendering while waiting for platform loading readiness.
- Standalone remains no-op and its commercial continuation remains immediate.
- Preserve the user-owned untracked `output/` directory.

---

### Task 1: Reproduce and fix the startup lifecycle ordering

**Files:**
- Modify: `src/platform/lifecycle.test.ts`
- Modify: `src/platform/lifecycle.ts`

**Interfaces:**
- Consumes: `setGameplayDesired(active, phase)`, `markLoadingFinished()`, and `whenIdle()`.
- Produces: a controller that gates gameplay edges until `loadingSent === true`.

- [ ] **Step 1: Add the failing pre-loading gameplay tests**

Add tests that call `setGameplayDesired(true, 'playing')` before `markLoadingFinished()`, await idle, and assert the log is only `['init']`. Then mark loading and require exactly `['init', 'loadingFinished', 'gameplayStart']`. Repeat desired/loading calls and assert single-shot events. Add a case that sets desired true and then false before loading and requires no gameplay event after loading.

- [ ] **Step 2: Run the focused test and confirm the race**

Run:

```powershell
npx vitest run --config vitest.config.ts src/platform/lifecycle.test.ts --maxWorkers=1
```

Expected before the fix: the new test fails because `gameplayStart` appears before loading readiness.

- [ ] **Step 3: Add the minimal readiness gate**

After the `loadingDesired && !loadingSent` block in `flush()`, add:

```ts
if (!loadingSent) return
```

This retains `gameplayDesired` and lets the readiness flush emit loading followed by the latest valid gameplay edge in one serialized task.

- [ ] **Step 4: Run focused platform lifecycle tests**

Run the lifecycle, loading, adapter, input-lock, audio, storage, and App tests. All must pass, including the existing commercial-break test.

---

### Task 2: Full regression, production QA, and delivery

**Files:**
- Modify only if needed for evidence: `docs/qa/poki-platform-build-v1.md`

**Interfaces:**
- Consumes: final controller and existing QA scripts.
- Produces: validated standalone/Poki outputs and a pushed single fix commit.

- [ ] **Step 1: Run complete validation**

```powershell
npm test -- --run
npm run validate:art
npm run build
npm run build:poki
node scripts/audit-platform-builds.mjs
node scripts/qa-poki-platform-build-v1.mjs
```

Expected: all tests, both builds, build audit, storage QA, viewport QA, ad freeze, and the full Day 1 → Day 2 Poki lifecycle pass.

- [ ] **Step 2: Audit frozen scope**

```powershell
git diff --exit-code 8ac14e8 -- src/assets src/components src/game src/landscape src/analytics src/i18n
```

Allow only `src/platform/lifecycle.ts` and `src/platform/lifecycle.test.ts` in source changes. Confirm `output/` remains untouched.

- [ ] **Step 3: Commit and push**

```powershell
git add src/platform/lifecycle.ts
git add -f src/platform/lifecycle.test.ts
git commit -m "fix: order poki loading before gameplay start"
git push origin codex/poki-platform-build-v1
git ls-remote --heads origin refs/heads/codex/poki-platform-build-v1
```

Expected: the remote branch points to the new final commit and main remains unmerged.
