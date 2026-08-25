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
    expect(css).toMatch(/\.gameplay-hud button:hover\s*\{[^}]*brightness/s)
    expect(css).toMatch(/\.gameplay-hud button:active\s*\{[^}]*translateY\(3px\)/s)
  })
})
