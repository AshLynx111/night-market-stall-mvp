import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const cssPath = path.join(process.cwd(), 'src', 'landscape.css')
const landscapeSourcePath = path.join(process.cwd(), 'src', 'components', 'LandscapeGame.tsx')

describe('home-derived visual system', () => {
  it('defines the shared night-market material tokens', async () => {
    const css = await readFile(cssPath, 'utf8')
    for (const token of [
      'night-bg',
      'night-warm-edge',
      'wood-dark',
      'wood-mid',
      'wood-light',
      'gold-border',
      'paper-cream',
      'paper-aged',
      'warm-highlight',
      'ink-dark',
      'shadow-warm',
      'panel-radius',
      'panel-border',
      'panel-shadow',
    ]) {
      expect(css).toContain(`--${token}:`)
    }
  })

  it('uses an approved scene extension instead of a flat blue game-screen background', async () => {
    const [css, source] = await Promise.all([
      readFile(cssPath, 'utf8'),
      readFile(landscapeSourcePath, 'utf8'),
    ])
    expect(source).toContain("'--game-ambient-bg': `url(${kitchenScreen})`")
    expect(css).toMatch(/\.game-screen::before\s*\{[^}]*background-image:\s*var\(--game-ambient-bg\)[^}]*blur/s)
    expect(css).not.toMatch(/\.game-screen\s*\{[^}]*background:\s*#101a2c;/s)
  })

  it('skins the frozen gameplay HUD with wood, gold and aged paper materials', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toMatch(/\.gameplay-hud button,[^{]*\.gameplay-hud__coins\s*\{[^}]*var\(--wood-dark\)[^}]*var\(--gold-border\)/s)
    expect(css).toMatch(/\.gameplay-hud__orders\s*\{[^}]*var\(--paper-aged\)[^}]*inset/s)
    expect(css).toMatch(/\.gameplay-hud button\s*\{[^}]*transform:\s*none/s)
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*\.gameplay-hud button:hover\s*\{[^}]*brightness/s)
    expect(css).toMatch(/\.gameplay-hud button:active\s*\{[^}]*brightness[^}]*inset/s)
    const hudInteractionRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selector]) => /\.gameplay-hud(?: button|__day|__control)/.test(selector)
        && /:(?:hover|active|focus|focus-visible)/.test(selector))
    expect(hudInteractionRules.length).toBeGreaterThan(0)
    for (const [, selector, declarations] of hudInteractionRules) {
      expect(declarations, selector.trim()).not.toMatch(/\b(?:transform|translate|scale|top|margin(?:-[a-z]+)?):/)
    }
    expect(css).toMatch(/\.gameplay-hud__orders\s*\{[^}]*transform:\s*translateX\(-50%\)/s)
  })

  it('keeps the mobile HUD on the logical scene scale without counter-scaling', async () => {
    const css = await readFile(cssPath, 'utf8')
    const hudCounterScaleRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selector, declarations]) => /\.gameplay-hud__(?:day|orders|coins|control)/.test(selector)
        && declarations.includes('var(--scene-inverse-scale)'))

    expect(hudCounterScaleRules.map(([, selector]) => selector.trim())).toEqual([])
    expect(css).toMatch(/\.gameplay-hud__orders\s*\{[^}]*transform:\s*translateX\(-50%\)/s)
    expect(css).toMatch(/\.help-fab\s*\{[^}]*var\(--scene-inverse-scale\)/s)
  })

  it('unifies day cards without changing the six-card progression structure', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toMatch(/\.day-card::before\s*\{[^}]*var\(--paper-aged\)[^}]*inset/s)
    expect(css).toMatch(/\.day-card\.is-locked::before\s*\{[^}]*brightness\(\.78\)[^}]*saturate\(\.62\)/s)
    expect(css).toMatch(/\.day-card:not\(\.is-locked\):hover::before,[^{]*\{[^}]*var\(--warm-highlight\)/s)
  })

  it('carries the same material system through summary, settings and modal panels', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toMatch(/\.summary-card::before\s*\{[^}]*var\(--paper-aged\)[^}]*mix-blend-mode:\s*multiply/s)
    expect(css).toMatch(/\.summary-stats > div::before\s*\{[^}]*inset[^}]*var\(--paper-aged\)/s)
    expect(css).toMatch(/\.settings-slider input\s*\{[^}]*var\(--wood-dark\)[^}]*var\(--gold-border\)/s)
    expect(css).toMatch(/\.menu-modal,[^{]*\.abandon-modal\s*\{[^}]*var\(--paper-cream\)[^}]*var\(--gold-border\)/s)
  })

  it('presents the portrait rotate notice as an in-game wood plaque inside safe areas', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toMatch(/\.rotate-device::before\s*\{[^}]*var\(--wood-dark\)[^}]*var\(--gold-border\)[^}]*var\(--panel-shadow\)/s)
    expect(css).toMatch(/\.rotate-device::after\s*\{[^}]*var\(--paper-cream\)[^}]*var\(--paper-aged\)/s)
    expect(css).toMatch(/\.rotate-device\s*\{[^}]*var\(--game-safe-top\)[^}]*var\(--night-bg\)/s)
  })
})
