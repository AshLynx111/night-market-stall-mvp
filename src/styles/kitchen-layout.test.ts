import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { KITCHEN_GRIDDLE_RECTS, KITCHEN_RACK_LAYOUTS, rackInnerPolygons, rackRectangles } from '../landscape/kitchen/sceneGeometry'

const landscapeCss = readFileSync('src/landscape.css', 'utf8')
const kitchenCss = readFileSync('src/styles/kitchen.css', 'utf8')

function mediaBlock(from: string, to: string, source = landscapeCss) {
  const start = source.indexOf(from)
  const end = source.indexOf(to, start + from.length)
  return source.slice(start, end < 0 ? undefined : end)
}

describe('logical kitchen layout CSS', () => {
  it('has one canonical source for the griddle and rack geometry consumed by later scene layers', () => {
    expect(KITCHEN_GRIDDLE_RECTS).toEqual({
      left: { left: 491, top: 559, width: 269, height: 218 },
      right: { left: 760, top: 559, width: 269, height: 218 },
    })
    expect(KITCHEN_RACK_LAYOUTS['approved-2x3']).toMatchObject({ columns: 2, rows: 3 })
    expect(rackRectangles('approved-2x3')).toHaveLength(6)
  })

  it('centers food, hit targets, and tutorial paths from the same griddle custom properties', () => {
    const leftGeometry = kitchenCss.match(/\.griddle-slot--left,\s*\.cooking-gesture-target--left,\s*\.tutorial-gesture-cue--left\s*\{[^}]+\}/s)?.[0] ?? ''
    const rightGeometry = kitchenCss.match(/\.griddle-slot--right,\s*\.cooking-gesture-target--right,\s*\.tutorial-gesture-cue--right\s*\{[^}]+\}/s)?.[0] ?? ''
    const food = kitchenCss.match(/\.griddle-slot__food\s*\{[^}]+\}/s)?.[0] ?? ''
    const stageArt = kitchenCss.match(/\.griddle-slot__stage-art\s*\{[^}]+\}/s)?.[0] ?? ''

    for (const geometry of [leftGeometry, rightGeometry]) {
      expect(geometry).toContain('left: var(--griddle-')
      expect(geometry).toContain('top: var(--griddle-')
      expect(geometry).toContain('width: var(--griddle-')
      expect(geometry).toContain('height: var(--griddle-')
    }
    expect(food).toMatch(/left:\s*50%/)
    expect(food).toMatch(/top:\s*50%/)
    expect(food).toMatch(/width:\s*calc\(100% - \d+px\)/)
    expect(food).toMatch(/height:\s*calc\(100% - \d+px\)/)
    expect(food).toContain('transform: translate(-50%, -50%)')
    expect(stageArt).toContain('object-fit: contain')
    expect(stageArt).toContain('object-position: 50% 50%')
  })

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

  it('starts in the approved 2 by 3 physical rack and switches to a non-overlapping 3 by 5 overflow rack', () => {
    const rackRule = kitchenCss.match(/\.kitchen-scene__ingredients\s*\{[^}]+\}/s)?.[0] ?? ''
    const rack = KITCHEN_RACK_LAYOUTS['approved-2x3']

    expect(rack.columns).toBe(2)
    expect(rack.rows).toBe(3)
    expect(rack.left + (rack.columns - 1) * rack.columnGap + rack.width).toBeLessThan(1440 * .341)
    expect(rack.top + 2 * rack.rowGap + rack.height).toBeLessThanOrEqual(710)
    expect(rack.top + (rack.rows - 1) * rack.rowGap + rack.height).toBeLessThanOrEqual(710)

    const rectangles = rackRectangles('approved-2x3')
    rectangles.forEach((rectangle, index) => {
      rectangles.slice(index + 1).forEach((other) => {
        const overlaps = rectangle.left < other.right && rectangle.right > other.left
          && rectangle.top < other.bottom && rectangle.bottom > other.top
        expect(overlaps).toBe(false)
      })
    })

    const expanded = KITCHEN_RACK_LAYOUTS['expanded-3x5']
    expect(expanded.columns).toBe(3)
    expect(expanded.rows).toBe(5)
    expect(Math.max(...rackRectangles('expanded-3x5').map((rectangle) => rectangle.right))).toBeLessThan(1440 * .341)
    expect(Math.max(...rackRectangles('expanded-3x5').map((rectangle) => rectangle.bottom))).toBeLessThanOrEqual(810)

    expect(rackRule).not.toContain('--ingredient-rack-')
    expect(kitchenCss).not.toMatch(/\.kitchen-scene__ingredients\[data-rack-layout="expanded-3x5"\]\s*\{[^}]*--ingredient-rack-/s)
    expect(rackInnerPolygons('approved-2x3')).toHaveLength(6)
    expect(rackInnerPolygons('expanded-3x5')).toHaveLength(15)
    expect(kitchenCss).toMatch(/\.table-ingredient\s*\{[^}]*left:\s*var\(--ingredient-rack-control-left\)[^}]*top:\s*var\(--ingredient-rack-control-top\)/s)
    expect(kitchenCss).toMatch(/\.table-ingredient__viewport\s*\{[^}]*left:\s*var\(--ingredient-rack-inner-left\)[^}]*clip-path:\s*polygon\(var\(--ingredient-rack-inner-clip\)\)/s)
    expect(kitchenCss).not.toContain('.sauce-brush {')
    expect(kitchenCss).toContain('.table-ingredient--sauce.is-selected')
  })
})
