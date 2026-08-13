import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landscapeSource = readFileSync('src/components/LandscapeGame.tsx', 'utf8')
const landscapeCss = readFileSync('src/landscape.css', 'utf8')
const kitchenCss = readFileSync('src/styles/kitchen.css', 'utf8')

describe('reference-master gameplay composition', () => {
  it('uses the illustrated final UI plate as the live kitchen background', () => {
    expect(landscapeSource).toContain("kitchen-screen-user-final.png")
    expect(landscapeSource).not.toContain("mainBackground from '../assets/approved/main-ui/night-market-clean-background.png'")
  })

  it('positions live HUD values inside the painted hanging signs', () => {
    expect(landscapeCss).toMatch(/\.hud__day\s*\{[^}]*position:\s*absolute[^}]*left:\s*24px[^}]*top:\s*13px/s)
    expect(landscapeCss).toMatch(/\.hud__satisfaction\s*\{[^}]*position:\s*absolute[^}]*left:\s*299px/s)
    expect(landscapeCss).toMatch(/\.hud__coins\s*\{[^}]*position:\s*absolute[^}]*left:\s*575px/s)
    expect(landscapeCss).toMatch(/\.hud__goal\s*\{[^}]*position:\s*absolute[^}]*left:\s*1142px/s)
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
    expect(landscapeSource).toContain('home-screen-user-final.png')
    expect(landscapeSource).toContain('home-screen__art')
    expect(landscapeCss).toMatch(/\.home-hotspot\s*\{/)
  })

  it('imports the five approved user screen plates and gives each screen a semantic art marker', () => {
    for (const filename of [
      'home-screen-user-final.png',
      'day-select-user-final.png',
      'kitchen-screen-user-final.png',
      'summary-screen-user-final.png',
      'settings-screen-user-final.png',
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
    expect(landscapeSource).toContain('src={liveKitchenScreen}')
    expect(landscapeSource).toContain("'--home-bg': `url(${summaryScreen})`")
    expect(landscapeSource).toContain('className="settings-screen__art"')
    expect(landscapeSource).toContain('src={settingsScreen}')
  })
})
