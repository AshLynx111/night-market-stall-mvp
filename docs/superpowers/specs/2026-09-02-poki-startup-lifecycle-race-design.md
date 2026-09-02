# Poki Startup Lifecycle Race Fix Design

## Goal

Guarantee that a fresh Poki document can never emit `gameplayStart()` before its single `gameLoadingFinished()` event, without blocking the game UI or changing standalone behavior.

## Scope

Only the platform lifecycle controller and its focused tests change. UI, characters, gameplay, ad placements, audio architecture, campaign, progression, and save data remain frozen.

## Controller behavior

`gameplayDesired` remains the current source of truth. `setGameplayDesired(true, 'playing')` may run before loading readiness, but `flush()` must not emit a gameplay edge while `loadingSent` is false.

When `markLoadingFinished()` runs, the same serialized flush first emits `gameLoadingFinished()` once and sets `loadingSent=true`. It then evaluates the latest `gameplayDesired` value:

- `true`: emit one `gameplayStart()`;
- `false`: emit no stale start.

Repeated loading marks and repeated desired-state calls remain deduplicated by `loadingSent` and `gameplaySent`. The existing break serialization remains unchanged. Standalone commercial continuations remain synchronous and its adapter remains no-op.

## Tests

Add explicit coverage for:

1. desired gameplay before loading produces only `init` before readiness;
2. readiness then produces exactly `init`, `loadingFinished`, `gameplayStart`;
3. repeated desired/loading calls remain single-shot;
4. leaving gameplay before readiness suppresses the pending start;
5. existing pause and commercial-break ordering still passes.

Run the focused lifecycle test, complete test suite, art validation, standalone build/audit, Poki build/audit, and production Poki browser QA. Commit the fix separately and push the existing branch without merging main.
