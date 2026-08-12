import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const landscapeCss = readFileSync('src/landscape.css', 'utf8')
const kitchenCss = readFileSync('src/styles/kitchen.css', 'utf8')

function mediaBlock(from: string, to: string, source = landscapeCss) {
  const start = source.indexOf(from)
  const end = source.indexOf(to, start + from.length)
  return source.slice(start, end < 0 ? undefined : end)
}

describe('logical kitchen layout CSS', () => {
  it('does not physically resize the gameplay HUD or help control in viewport media rules', () => {
    const narrow = mediaBlock('@media (max-width: 1050px)', '@media (max-height: 690px)')
    const short = mediaBlock('@media (max-height: 690px)', '@media (orientation: portrait)')

    for (const block of [narrow, short]) {
      expect(block).not.toMatch(/\.hud(?:\b|__)/)
      expect(block).not.toContain('.help-fab')
      expect(block).not.toContain('.game-screen__logical')
    }
  })

  it('keeps the help control above the bottom discard-control band', () => {
    expect(landscapeCss).toContain('.help-fab { right: 18px; bottom: 84px; }')
  })

  it('lets the gameplay viewport shrink below the non-game screen minimum height', () => {
    expect(landscapeCss).toMatch(/\.game-screen\s*\{[^}]*min-height:\s*0;/)
  })

  it('provides a dedicated 844 by 390 campaign-shell layout with no forced body overflow', () => {
    const short = mediaBlock('@media (max-height: 690px)', '@media (orientation: portrait)')

    expect(short).toMatch(/\.home-screen[\s\S]*\.select-screen[\s\S]*\.summary-screen[\s\S]*min-height:\s*0/)
    expect(short).toMatch(/\.day-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\)/)
    expect(short).toMatch(/\.summary-card\s*\{[^}]*max-height:\s*calc\(100dvh/)
    expect(short).toContain('.event-screen--overlay')
  })

  it('counter-scales guided copy and griddle status at an actual 844 by 390 landscape viewport', () => {
    const compact = mediaBlock(
      '@media (max-height: 480px) and (orientation: landscape)',
      '@media (prefers-reduced-motion: reduce)',
      kitchenCss,
    )

    expect(compact).toMatch(/\.guided-tutorial\s*\{[^}]*scale\(var\(--scene-inverse-scale\)\)/)
    expect(compact).toMatch(/\.guided-tutorial\s*\{[^}]*left:\s*calc\(50% \+ 128px\)/)
    expect(compact).toMatch(/\.griddle-slot__status\s*\{[^}]*scale\(var\(--scene-inverse-scale\)\)/)
    expect(compact).toContain('transform-origin: top center')
    expect(compact).toContain('transform-origin: center')
  })

  it('anchors customer motion at the feet without whole-actor bobbing', () => {
    const actorRule = kitchenCss.match(/\.kitchen-customer__actor\s*\{[^}]+\}/s)?.[0] ?? ''
    expect(actorRule).toContain('transform-origin: 50% 100%')
    expect(actorRule).not.toContain('animation:')
    expect(kitchenCss).not.toMatch(/@keyframes\s+[^\s{]*(bob|float|bounce)/i)
  })

  it('disables non-active actor targeting and bubble entrance motion for reduced-motion users', () => {
    expect(kitchenCss).toMatch(/\.kitchen-customer__actor\.presence-entering\s*,\s*\.kitchen-customer__actor\.presence-leaving\s*\{[^}]*pointer-events:\s*none;/s)
    const reduced = kitchenCss.slice(kitchenCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/\.kitchen-customer__bubble[^{]*\{[^}]*animation:\s*none;/s)
  })

  it('declares a compact 3 by 5 left rack outside both griddles and the Day 1 tutorial', () => {
    const rackRule = kitchenCss.match(/\.kitchen-scene__ingredients\s*\{[^}]+\}/s)?.[0] ?? ''
    const px = (name: string) => Number(rackRule.match(new RegExp(`${name}:\\s*(\\d+)px`))?.[1])
    const count = (name: string) => Number(rackRule.match(new RegExp(`${name}:\\s*(\\d+)`))?.[1])
    const rack = {
      columns: count('--ingredient-rack-columns'),
      rows: count('--ingredient-rack-rows'),
      left: px('--ingredient-rack-left'),
      top: px('--ingredient-rack-top'),
      columnGap: px('--ingredient-rack-column-gap'),
      rowGap: px('--ingredient-rack-row-gap'),
      width: px('--ingredient-rack-control-width'),
      height: px('--ingredient-rack-control-height'),
    }

    expect(rack.columns).toBe(3)
    expect(rack.rows).toBe(5)
    expect(rack.left + (rack.columns - 1) * rack.columnGap + rack.width).toBeLessThan(1440 * .341)
    expect(rack.top + rack.rowGap + rack.height).toBeLessThanOrEqual(600)
    expect(rack.top + (rack.rows - 1) * rack.rowGap + rack.height).toBeLessThanOrEqual(810)

    const rectangles = Array.from({ length: rack.columns * rack.rows }, (_, index) => ({
      left: rack.left + (index % rack.columns) * rack.columnGap,
      top: rack.top + Math.floor(index / rack.columns) * rack.rowGap,
      right: rack.left + (index % rack.columns) * rack.columnGap + rack.width,
      bottom: rack.top + Math.floor(index / rack.columns) * rack.rowGap + rack.height,
    }))
    rectangles.forEach((rectangle, index) => {
      rectangles.slice(index + 1).forEach((other) => {
        const overlaps = rectangle.left < other.right && rectangle.right > other.left
          && rectangle.top < other.bottom && rectangle.bottom > other.top
        expect(overlaps).toBe(false)
      })
    })

    expect(kitchenCss).toMatch(/\.table-ingredient\s*\{[^}]*left:\s*calc\(var\(--ingredient-rack-left\)[^}]*top:\s*calc\(var\(--ingredient-rack-top\)/s)
    expect(kitchenCss).toMatch(/\.sauce-brush\s*\{[^}]*left:\s*calc\(var\(--ingredient-rack-left\)[^}]*top:\s*calc\(var\(--ingredient-rack-top\)/s)
  })
})
