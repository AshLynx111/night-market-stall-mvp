# Poki Mobile Final Fix Design

## Goal

Make the Poki production build start in English without a `lang` query, keep the English Summary upgrade area contained at small landscape sizes, and prevent iOS/Poki mobile browser chrome changes from continuously rescaling gameplay. Preserve standalone defaults, desktop presentation, gameplay geometry, platform lifecycle, SDK integration, ads, campaign, and saves.

## Scope and frozen behavior

Changes are limited to locale resolution, focused Summary responsive CSS, gameplay viewport observation, HUD activation wiring, regression tests, and committed Poki production QA evidence. Characters, gameplay rules, values, HUD design, advertising lifecycle, Poki SDK integration, campaign state, save data, and 1440x810 desktop visuals remain unchanged.

The work stays on `codex/poki-platform-build-v1`, is delivered as one final commit, and is pushed without merging `main`. The existing untracked `output/` directory is user-owned and remains untouched.

## Locale resolution

`resolveInitialLocale` receives the current platform explicitly. Resolution is deterministic:

1. A supported `?lang=en` or `?lang=zh-CN` always wins.
2. When the platform is `poki` and no supported query override is present, return `en` without consulting persisted locale storage.
3. When the platform is `standalone`, preserve the existing stored-locale fallback and final `zh-CN` default.

The provider passes `import.meta.env.VITE_PLATFORM` into the resolver. Query overrides may still be persisted for QA, but an old stored Chinese locale cannot influence a later parameterless Poki launch.

## Summary upgrade area

Keep the Summary DOM and art-aligned card geometry unchanged. Add an English, small-height landscape media override that only adjusts typography and internal spacing inside the existing funds and upgrade cards.

- `Cash` and `¥60` remain a compact single-row value inside the funds card.
- `Upgrade Heat Lv.1` and `Upgrade Sign Lv.1` use a compact title line or controlled two-line title region.
- Benefit and price remain visible inside their own card.
- Font size, line height, padding, and gap shrink only at small landscape sizes.
- No page-wide scale reduction is introduced.
- The existing 1440x810 rules remain the desktop source of truth.

Automated QA measures the visible copy boxes against their parent card boxes and rejects document-level horizontal overflow at 640x360 and 836x470.

## Stable gameplay viewport

On touch/coarse-pointer landscape gameplay, use the stable viewport unit (`100svh`) for the game container rather than following dynamic browser chrome through `100dvh`. `ResizeObserver` remains the primary scale signal because it reports actual game-container size changes, including Poki iframe/container resizing.

Remove immediate scaling from `visualViewport.resize`. Keep a settled window/orientation fallback so genuine viewport changes are re-read after resize activity has stopped. This fallback reads the container bounds, so toolbar-only events that do not change the stable container cannot pump the scale. No device dimensions are hard-coded.

Regression tests simulate a burst of visual-viewport resize events and require no continuous scene-scale changes. A real observed container resize must still update scale, and orientation/window settling remains available.

## HUD activation

Use a single touch pointer-up activation for Day/Home, Pause, and Sound because transformed mobile HUD controls do not reliably receive Chromium/iOS compatibility clicks. Record the activated target and event timestamp, then suppress only a same-target compatibility click inside a bounded time window. This uses no timer and cannot clear suppression before the synthesized click arrives.

Mouse clicks and keyboard-generated zero-detail clicks continue through native `onClick`. Tests cover a touch pointer-up followed by a compatibility click, one mouse click, and keyboard Enter/Space activation. The HUD DOM, labels, dimensions, icons, shortcuts, and geometry do not change.

## Production QA and evidence

Extend the Poki production browser QA to run in English and capture:

- gameplay 640x360;
- summary 640x360;
- gameplay 836x470;
- summary 836x470.

The script checks locale metadata, text/card containment, clipping candidates, horizontal scroll, HUD single activation, pause/resume flows, Home cancel flows, stable scene scale through toolbar-like resize bursts, and a real container/viewport resize. The four screenshots and a compact JSON or Markdown result report are committed under a dedicated `docs/qa/screenshots/poki-mobile-final-fix/` directory.

Final validation runs exactly:

```powershell
npm test
npm run build
npm run build:poki
npm run test:poki
```

The final diff is audited to ensure frozen systems and desktop presentation were not changed.
