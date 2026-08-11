import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landscapeSource = readFileSync('src/components/LandscapeGame.tsx', 'utf8')
const landscapeCss = readFileSync('src/landscape.css', 'utf8')
const kitchenCss = readFileSync('src/styles/kitchen.css', 'utf8')

describe('reference-master gameplay composition', () => {
  it('uses the illustrated final UI plate as the live kitchen background', () => {
    expect(landscapeSource).toContain("game-main-screen-final.png")
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
})
