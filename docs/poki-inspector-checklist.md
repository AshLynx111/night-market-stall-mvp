# Poki RC V1 — manual Inspector checklist

Upload `night-market-poki-rc-v1.zip` yourself. Match its SHA-256 and full source commit against `releases/poki-rc-v1-manifest.json` first. ZIP root must contain `index.html` and `assets/`.

**Live Inspector status: NOT RUN. Current release verdict: NOT READY pending the external-network gate in docs/poki-rc-v1-network-audit.md.** Every box below intentionally starts unchecked. Local SDK mocks, Edge touch emulation and automated screenshots do not count as Inspector or physical Safari validation.

Record: date / tester / Inspector URL or session / ZIP SHA-256 / desktop browser / phone model and OS / screenshots / issues.

- [ ] Game loads from the uploaded ZIP; no wrapper folder or missing assets.
- [ ] English default at root URL with fresh localStorage/sessionStorage, without `?lang=en`.
- [ ] `gameLoadingFinished` once, after SDK initialization and loading; before any `gameplayStart`.
- [ ] Start Game → Day 1 → `gameplayStart`; no commercial break before first Start.
- [ ] Pause → `gameplayStop` once.
- [ ] Resume → `commercialBreak` → promise resolves → `gameplayStart` once.
- [ ] Day Complete → Summary → `gameplayStop`; Summary is not gameplay.
- [ ] Next Day → `commercialBreak` → Day N+1 → `gameplayStart`.
- [ ] Play Again → `commercialBreak` → restarted day → `gameplayStart`.
- [ ] No duplicate lifecycle events during repeated Pause / Resume / Next Day.
- [ ] Day 5 gameplay → event → return stops and starts lifecycle correctly.
- [ ] Commercial break pauses game for at least 2 seconds: customer patience, heat and cooking timers freeze.
- [ ] During commercial break: ingredients, drag, griddle gestures, pack, serve, touch/pointer and keyboard inputs cannot change gameplay.
- [ ] Commercial break mutes audio, including music and cooking effects.
- [ ] Audio returns after break at the user's original volume; settings remain unchanged.
- [ ] After no-ad / rejected ad, gameplay resumes and input/audio unlock.
- [ ] Scaling desktop: 1440×810, 1280×720, 1031×580, 836×470, 640×360. Check scrollbar, HUD, people, bubbles, trays and griddles.
- [ ] Scaling mobile: 844×390, 836×470, 640×360, including browser toolbar changes and rotation.
- [ ] Touch controls: complete an order using ingredient tap, ingredient drag, sauce, cut, roll, pack and serve; operate Pause and Sound.
- [ ] Mobile Safari HUD stable on a physical iPhone; verify tap feedback and toolbar movement.
- [ ] Day 1 Summary fits at all desktop/mobile sizes; upgrade cards remain readable and tappable.
- [ ] Ingredient trays Day 1–6 visually acceptable; foods stay in wells and labels remain readable.
- [ ] Play at least one recipe in every Day 1–6; trigger and return from the Day 5 event.
- [ ] Fresh user: Home → Start → Day 1 → first order completes without old saves or URL parameters.
- [ ] Returning user: Continue, unlocked days, upgrades and English default survive reload without damaging the save.
- [ ] Storage disabled / incognito: Home → Start → first order still works; persistence may be unavailable.
- [ ] Home, Settings, Day Select, Gameplay, Tutorial, order bubbles, labels, Pause, Summary, Upgrade and Rotate remain English. Decorative scene signs may be Chinese.
- [ ] `?playtest=1`, `?debug=1`, `?qa=1` and combined flags cannot expose test/export/feedback UI.
- [ ] Keyboard Start / Pause / Resume work with Enter, Space and Escape; focus is visible and dialogs retain focus.
- [ ] No unexpected external requests. Save Network log; explain each Poki SDK/ad environment request. Any non-Poki third-party request is a blocker pending investigation.
- [ ] No console errors, unhandled rejections, missing asset 404s, blocked runtime dependencies or infinite retries. Attach exact warnings and reasons if any.
- [ ] Cold load reaches an interactive UI without an indefinitely blocked resource or long main-thread freeze.
- [ ] Capture Inspector event log and representative desktop/mobile screenshots.

Only after these checks pass should this candidate be considered for **READY FOR POKI SUBMISSION**. Do not infer that status from local test results.

Event reference: [Poki SDK overview](https://developers.poki.com/guide/sdk-overview).
