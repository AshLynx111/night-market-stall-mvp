import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landscapeSource = readFileSync('src/components/LandscapeGame.tsx', 'utf8')
const landscapeCss = readFileSync('src/landscape.css', 'utf8')
const kitchenCss = readFileSync('src/styles/kitchen.css', 'utf8')
const gameplaySource = [
  landscapeSource,
  readFileSync('src/components/game/KitchenScene.tsx', 'utf8'),
  readFileSync('src/components/game/CookingGestureLayer.tsx', 'utf8'),
  readFileSync('src/components/game/OrderBubble.tsx', 'utf8'),
  readFileSync('src/components/game/TutorialOverlay.tsx', 'utf8'),
  landscapeCss,
  kitchenCss,
].join('\n')

describe('reference-master gameplay composition', () => {
  it('uses the clean illustrated kitchen background without baked HUD signs', () => {
    expect(landscapeSource).toContain("night-market-clean-background.webp")
    expect(landscapeSource).toContain('data-kitchen-expanded-rack-overlay')
  })

  it('keeps the compact gameplay HUD in one shallow top row', () => {
    expect(landscapeCss).toMatch(/\.gameplay-hud\s*\{[^}]*top:\s*12px[^}]*height:\s*52px/s)
    expect(landscapeCss).toContain('.gameplay-hud__orders')
    expect(landscapeCss).toContain('.gameplay-hud__coins')
    expect(landscapeSource).not.toContain('hud__satisfaction')
  })

  it('keeps the order bubble directly above its customer instead of beside them', () => {
    expect(kitchenCss).toContain('width: 132px')
    expect(kitchenCss).toContain('min-height: 94px')
  })

  it('crops supplied bin art into the physical background rack without a second container', () => {
    expect(kitchenCss).toMatch(/\.table-ingredient__viewport\s*\{[^}]*overflow:\s*hidden/s)
    expect(kitchenCss).toMatch(/\.table-ingredient__food-art\s*\{[^}]*object-fit:\s*contain/s)
    expect(kitchenCss).not.toContain('width: 145%')
    expect(kitchenCss).not.toContain('.table-ingredient__bin-art')
    expect(kitchenCss).not.toContain('.table-ingredient__vessel')
    expect(kitchenCss).not.toContain('.table-ingredient__contents')
    expect(kitchenCss).not.toContain('.griddle-slot__modifier-art')
  })

  it('uses the supplied home-menu plate with transparent interaction hotspots', () => {
    expect(landscapeSource).toContain('home-screen-user-final.webp')
    expect(landscapeSource).toContain('home-screen__art')
    expect(landscapeCss).toMatch(/\.home-hotspot\s*\{/)
  })

  it('imports the approved screen plates and gives each screen a semantic art marker', () => {
    for (const filename of [
      'home-screen-user-final.webp',
      'day-select-user-final.webp',
      'night-market-clean-background.webp',
      'summary-screen-user-final.webp',
      'settings-screen-user-final.webp',
    ]) {
      expect(landscapeSource).toContain(filename)
    }

    for (const screen of ['home', 'select', 'kitchen', 'summary', 'settings']) {
      expect(landscapeSource).toContain(`data-screen-art="${screen}"`)
    }
  })

  it('binds every semantic screen surface to its corresponding imported plate', () => {
    expect(landscapeSource).toContain('src={homeScreen}')
    expect(landscapeSource).toContain("'--home-bg': `url(${daySelectScreen})`")
    expect(landscapeSource).toContain('src={kitchenScreen}')
    expect(landscapeSource).toContain('expandedLiveKitchenScreen')
    expect(landscapeSource).toContain("'--home-bg': `url(${summaryScreen})`")
    expect(landscapeSource).toContain('className="settings-screen__art"')
    expect(landscapeSource).toContain('src={settingsScreen}')
  })

  it('contains no system emoji in the live gameplay presentation', () => {
    expect(gameplaySource).not.toMatch(/😊|💵|🔥|🎵|☾|♪|Ⅱ|🗑|☝|🌶|🍳|🔪|↻|🏮|📱|🛍/)
  })

  it('keeps critical UI readable in short landscape viewports', () => {
    expect(landscapeCss).toMatch(/@media \(max-height: 480px\) and \(orientation: landscape\)/)
    expect(landscapeCss).toContain('scale(var(--scene-inverse-scale))')
    expect(landscapeCss).toContain('calc(128px * var(--scene-inverse-scale))')
    expect(landscapeCss).toContain('--short-overlay-scale: min(var(--scene-inverse-scale), 1.35)')
    expect(kitchenCss).toContain('scale(var(--short-overlay-scale))')
    expect(kitchenCss).toContain('transform-origin: top center')
  })

  it('removes the remaining platform lock emoji from illustrated screens', () => {
    expect(landscapeSource).not.toContain('🔒')
    expect(landscapeSource).toContain('<GameIcon name="lock" />')
  })
})
