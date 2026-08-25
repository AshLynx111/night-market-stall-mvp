# I18n and Text Panel Preparation V1 Design

## Objective

Move the approved Chinese game into a stable bilingual foundation without redesigning pages or changing gameplay. The delivered application supports `zh-CN` and `en`, defaults to Chinese, exposes English through `?lang=en`, keeps dynamic text in DOM/CSS, and gives light text containers shared semantic styling hooks for a later art pass.

## Frozen Scope

- Do not modify character assets, character geometry, character positions, or `CustomerActor` visual styling.
- Do not modify gameplay rules, kitchen state machines, recipes, order generation, economy, scoring, upgrades, storage shape, or campaign progression.
- Do not modify `src/landscape/campaign.ts`, `src/landscape/progression.ts`, `src/landscape/dayRetention.ts`, or `src/landscape/kitchen/tutorial.ts` for localization. Their stable IDs and existing models are consumed by the presentation layer.
- Do not regenerate or replace approved page backgrounds.
- Do not redesign home, day select, gameplay, summary, settings, or mobile layout.
- Do not add SEO, ads, platform SDKs, analytics, a complex settings system, or a state-management library.

## Approaches Considered

### External i18n library

`react-i18next` would provide a mature ecosystem, but adds a dependency, configuration, and abstractions beyond the needs of two bundled locales. It is rejected for this phase.

### Typed in-repository i18n layer — selected

Flat, typed dictionaries live in `src/i18n/zh-CN.ts` and `src/i18n/en.ts`. An `I18nProvider` owns the locale, a `useI18n()` hook exposes `locale`, `t()`, and domain localization helpers, and tests enforce identical key sets. This is the smallest approach that prevents scattered locale conditionals and remains easy to replace with a library later.

### Page-local bilingual expressions

Inline `locale === 'en' ? ... : ...` expressions would be fast but recreate the hard-coded string problem. It is rejected except inside the centralized locale bootstrap where URL and storage values are normalized.

## Locale Resolution and Persistence

The provider resolves locale in this order:

1. Valid URL query `lang=en` or `lang=zh-CN`.
2. Valid `localStorage` value under `night-market-locale-v1`.
3. Default `zh-CN`.

A valid URL locale is persisted so the choice survives navigation and reloads. The provider sets `document.documentElement.lang` and `data-locale`. Invalid values safely fall back without throwing when storage is unavailable.

The required English preview is:

```text
/?lang=en
```

No visible language control is added in this phase because URL + persistence satisfies the lightweight switching requirement without altering an approved page.

## Translation Model

`TranslationKey` is derived from the Chinese dictionary. The English dictionary must satisfy `Record<TranslationKey, string>`. `t(key, values)` replaces `{name}`-style placeholders and leaves no unresolved placeholder in normal usage.

Key namespaces are stable and semantic:

- `home.*`, `select.*`, `hud.*`, `summary.*`, `settings.*`, `rotate.*`
- `modal.menu.*`, `modal.help.*`, `modal.abandon.*`, `event.day5.*`
- `tutorial.*`, `feedback.*`, `griddle.*`, `order.*`, `accessibility.*`
- `day.1.*` through `day.6.*`
- `recipe.<id>.*`, `ingredient.<id>.*`, `step.<id>.*`, `customer.<name>`

Domain helpers translate by stable identifiers rather than altering campaign data:

```ts
dayText(day: number, field: 'title' | 'story' | 'goal'): string
recipeText(id: RecipeId, field: 'name' | 'shortName'): string
ingredientText(id: IngredientId): string
stepText(id: StepId, field: 'label' | 'verb'): string
customerText(name: string): string
retentionText(cue: DayRetentionCueModel): { title: string; hook: string; accessibleDescription: string }
```

Unknown customer names fall back to their source string. Known campaign IDs are fully covered in both locales.

## Component Integration

`src/main.tsx` wraps `App` in `I18nProvider`. The provider has a Chinese default context, so isolated component tests remain deterministic unless they explicitly request English.

The following reachable presentation components consume the hook:

- `LandscapeGame`: all screens, actions, modals, upgrades, summary, event, settings, rotate prompt, alt text, and ARIA labels.
- `GameplayHud`: Day, Orders, Coins, pause, sound, and screen-reader text.
- `KitchenScene` and children: ingredient names, order modifiers, recipe/customer names, tutorial prompts, griddle states, delivery feedback, tray and gesture labels.
- `DayRetentionCue`: derives localized content from cue IDs and structured fields instead of rendering the Chinese strings already carried by the model.

Gameplay reducers may continue to create internal Chinese feedback strings if they are not rendered by the active landscape route. No gameplay file is changed merely to localize an internal state value.

## Approved Background Text

No background is regenerated. Existing environmental shop signage and the Chinese brand illustration remain part of the approved scene art. Actionable or informational UI text baked into approved page plates is handled as follows in English mode:

- Home hotspots receive visible English DOM labels over the existing button surfaces.
- Day select receives DOM title/back/menu labels and per-card English title, story, goal, and lock/current status surfaces.
- Summary receives a DOM `Day Complete` heading, localized stat labels, localized action labels, and existing dynamic text masks.
- Settings receives DOM title, row labels, and return label aligned to the existing panel.
- The full menu modal uses a maintainable English DOM menu instead of showing the Chinese menu board when locale is `en`.

Chinese mode preserves the currently accepted raster presentation. English overlays are classed and positioned within existing plates; they do not change hotspot geometry or business handlers.

## Text Surface System

The code gains semantic styling hooks, not a visual redesign:

- `.ui-text-surface`: common dynamic text surface contract.
- `.ui-text-surface--paper`: warm paper surface.
- `.ui-text-surface--wood`: dark wood text surface.
- `.ui-text-chip`: compact hint/status text.
- `.ui-text-panel--order`, `.ui-text-panel--hint`, `.ui-text-panel--hud`, `.ui-text-panel--stat`: role-specific hooks.

These classes are added to existing DOM elements such as order bubbles, tutorial panels, HUD labels, stat cards, select status, and settings labels. Shared CSS uses current visual tokens, slightly reduces pure white, and preserves each element's existing geometry. Future paper/wood art replacement can target these semantic classes without touching gameplay code.

## Cross-Locale Layout

English-only overlay classes use the existing percentage coordinate system. Text may use controlled two-line wrapping, `text-wrap: balance`, smaller English font sizes, and minimum padding. No interactive target shrinks. The 844×390 logical gameplay geometry and safe areas remain unchanged.

The root exposes `data-locale="en"`; CSS may use it only for typography, wrapping, and locale overlay visibility.

## Testing and QA

Automated tests cover:

- locale normalization and URL/storage precedence;
- equal Chinese/English key sets and interpolation;
- every day, recipe, ingredient, and cooking step translation;
- English rendering of critical pages and subcomponents;
- absence of unresolved placeholders and Chinese dynamic text in English QA surfaces;
- semantic text-panel classes on required containers;
- unchanged Chinese default behavior.

The production QA script uses stable class/data selectors rather than localized button text. It captures the real flow in both locales:

Home → Day Select → Day 1 Initial → Multiple Customers / Dual Griddle → Summary → Settings.

Each locale produces 1440×810 and 844×390 screenshots plus a contact sheet. A bilingual comparison sheet places Chinese and English side by side.

Final verification includes full Vitest, art validation, production build, screenshot overflow/error checks, and diffs from the new branch baseline for characters, gameplay logic, and campaign/progression.

## Acceptance Criteria

- `zh-CN` remains the default and visually matches the accepted version.
- `?lang=en` renders all critical dynamic UI and accessibility text in natural English.
- English text does not clip, overlap, or reduce interaction geometry at 1440×810 or 844×390.
- Dynamic light text containers remain DOM/CSS and expose shared semantic surface classes.
- No approved raster page background or character asset is regenerated.
- Character assets modified: NO.
- Gameplay logic modified: NO.
- Campaign/progression modified: NO.
