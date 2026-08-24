# Day 1 to Day N Retention Loop Design

## Objective

Make each completed day naturally pull the player toward the next existing day without adding a new progression system. The loop is:

`完成今天 → 看见成绩 → 看见明日新内容 → 一键进入明天 → 在选关页知道当前该推进哪里`.

The implementation reuses the six existing day configs, recipes, ingredient unlock days, stars, coins, upgrades, and campaign save. It adds no login reward, daily task, streak, energy, chest, currency, timer, notification, or new save field.

## Product Approach

Three approaches were considered:

1. Derived next-day preview and current-day marker. This is selected because it exposes value already present in the campaign and has no state or economy cost.
2. A story popup before every day. This adds a blocking step and risks slowing the cooking loop.
3. Daily missions or attendance rewards. This creates new state, reward balancing, and retention debt, so it is explicitly out of scope.

## Retention Model

Create `src/landscape/dayRetention.ts` as a pure presentation model. For each day it compares the current `DayConfig` with the previous day and derives:

- newly available ingredients from `INGREDIENT_UNLOCK_DAY`;
- newly available recipes from `DayConfig.recipes`;
- the existing Day 5 special-guest beat;
- the existing Day 6 celebrity-copycat beat;
- one short hook used on compact surfaces;
- one accessible description containing the day title, story, goal, and unlocks.

Day 1 treats the empty pre-campaign state as its previous day. Day 6 has no new ingredient or recipe, so its existing “明星同款热潮” story is the hook. No derived value is persisted.

## Summary Loop

The existing summary remains the settlement surface. Between the performance message and stat row, add one shallow paper-strip cue:

- Days 1–5: `明日 · [next title]` plus the next day's short hook.
- Day 6: `六日营业完成` plus `重玩关卡，挑战全三星`.

The cue does not open a modal and is not interactive. The existing primary action becomes specific, for example `明天 · 饭量挑战`, while preserving the same `startDay(DAYS[day.day])` callback. The Day 6 action remains `返回选关`.

The praise message, stars, stats, upgrade choices, replay action, settlement logic, and saved results remain unchanged. The summary geometry is tightened slightly so the new strip fits without covering the upgrade cards or actions.

## Level-Select Loop

The highest currently playable unsettled day receives one compact status hook inside its existing day card. Examples are derived from campaign data:

- Day 1: `经典款解锁`;
- Day 2: `大胃王解锁`;
- Day 3: `招牌芝士火鸡解锁`;
- Day 4: `奥尔良鸡排解锁`;
- Day 5: `特别人物登场`;
- Day 6: `明星同款热潮`.

Completed earlier days keep their stars and do not receive extra labels. Locked days keep the current lock message. When all six days are complete, Day 6 shows `全章完成 · 冲三星`.

The card's accessible label includes the day goal and short hook. Locks, unlock calculation, click behavior, and layout coordinates remain unchanged.

## Component Boundaries

- `dayRetention.ts`: pure derivation and copy composition; depends only on `campaign.ts`.
- `DayRetentionCue.tsx`: semantic summary strip; no local state or callbacks.
- `LandscapeGame.tsx`: selects the current/next derived cue and keeps navigation ownership.
- `landscape.css`: positions the strip and current-day status using the existing parchment style.

`LandscapeGame.tsx` does not gain new campaign rules. Tests can validate the pure model separately from the screen integration.

## Accessibility and Motion

The cue is normal document text with one concise visible line and a fuller `aria-label`. Current-day card status is duplicated into the button's accessible name. No new animation is required; the existing screen entrance transition is sufficient. Reduced-motion behavior is therefore unchanged.

## Verification

Automated tests cover:

- exact derived unlocks and hooks for Days 1–6;
- no new persistence fields;
- Day 1 summary previews Day 2 and uses a specific next-day action;
- Day 6 summary uses the completion message and returns to selection;
- a blank save marks Day 1 as the current retention target;
- settled Day 1–2 save marks Day 3 and leaves prior cards uncluttered;
- all-complete save marks Day 6 for replay;
- locked-day semantics and existing progression remain unchanged.

Production visual QA captures the Day 1 summary at 1440×810, the Day 3 current target on selection at 1440×810, and the Day 1 summary at 844×390. It also presses the specific next-day action and requires the Day 2 kitchen, preserved save data, decoded images, and zero console errors.

## Git and Rollback

Work is isolated on `codex/day-retention-loop-v1`. Design, implementation, and QA are separate commits. No merge or push is performed, and the preserved untracked `output/` directory is untouched.
