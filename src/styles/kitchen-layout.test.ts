import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { KITCHEN_GRIDDLE_RECTS, KITCHEN_GRIDDLE_USABLE_RECTS, KITCHEN_RACK_LAYOUTS, rackInnerPolygons, rackRectangles } from '../landscape/kitchen/sceneGeometry'

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

  it('keeps interaction layers on hitboxes while centering food on each painted cooking surface', () => {
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
    expect(food).toContain('left: var(--griddle-usable-local-center-x)')
    expect(food).toContain('top: var(--griddle-usable-local-center-y)')
    expect(food).toContain('width: var(--griddle-usable-width)')
    expect(food).toContain('height: var(--griddle-usable-height)')
    expect(food).toContain('transform: translate(-50%, -50%)')
    expect(kitchenCss).toMatch(/\.griddle-slot--left\s*\{[^}]*--griddle-usable-local-center-x:\s*var\(--griddle-left-usable-local-center-x\)/s)
    expect(kitchenCss).toMatch(/\.griddle-slot--right\s*\{[^}]*--griddle-usable-local-center-x:\s*var\(--griddle-right-usable-local-center-x\)/s)
    expect(KITCHEN_GRIDDLE_USABLE_RECTS.left).not.toEqual(KITCHEN_GRIDDLE_RECTS.left)
    expect(KITCHEN_GRIDDLE_USABLE_RECTS.right).not.toEqual(KITCHEN_GRIDDLE_RECTS.right)
    expect(stageArt).toContain('object-fit: contain')
    expect(stageArt).toContain('object-position: 50% 50%')
  })

  it('layers each ingredient below the well edge with a grounded shadow and lip label', () => {
    const viewport = kitchenCss.match(/\.table-ingredient__viewport\s*\{[^}]+\}/s)?.[0] ?? ''
    const contact = kitchenCss.match(/\.table-ingredient__viewport::before\s*\{[^}]+\}/s)?.[0] ?? ''
    const insetEdge = kitchenCss.match(/\.table-ingredient__viewport::after\s*\{[^}]+\}/s)?.[0] ?? ''
    const art = kitchenCss.match(/\.table-ingredient__food-art\s*\{[^}]+\}/s)?.[0] ?? ''
    const label = kitchenCss.match(/\.table-ingredient__label\s*\{[^}]+\}/s)?.[0] ?? ''

    expect(viewport).toContain('isolation: isolate')
    expect(contact).toContain('z-index: 0')
    expect(contact).toContain('radial-gradient')
    expect(insetEdge).toContain('z-index: 2')
    expect(insetEdge).toContain('inset: 0')
    expect(art).toContain('width: var(--ingredient-art-width)')
    expect(art).toContain('left: var(--ingredient-art-center-x)')
    expect(art).toContain('top: var(--ingredient-art-center-y)')
    expect(art).toContain('scaleY(var(--ingredient-art-perspective-y))')
    expect(label).toContain('left: var(--ingredient-rack-label-left)')
    expect(label).toContain('top: var(--ingredient-rack-label-top)')
    expect(label).not.toContain('bottom:')
  })

  it('preserves ingredient hover and active motion with the perspective transform', () => {
    const hover = kitchenCss.match(/\.table-ingredient:not\(:disabled\):hover \.table-ingredient__food-art\s*\{[^}]+\}/s)?.[0] ?? ''
    const activeSelected = kitchenCss.match(/\.table-ingredient:not\(:disabled\):active \.table-ingredient__food-art\s*,\s*\.table-ingredient\.is-selected \.table-ingredient__food-art\s*\{[^}]+\}/s)?.[0] ?? ''

    expect(hover).toContain('transform: translate(-50%, -53%) scale(1.05) scaleY(var(--ingredient-art-perspective-y))')
    expect(hover).toContain('filter: saturate(1.18) brightness(1.1) drop-shadow(0 4px 2px rgb(45 23 12 / .34))')
    expect(activeSelected).toContain('transform: translate(-50%, -48%) scale(.96) scaleY(var(--ingredient-art-perspective-y))')
    expect(activeSelected).not.toContain('filter:')
  })

  it('keeps the gameplay HUD on the logical scene scale while counter-scaling non-HUD overlays', () => {
    const narrow = mediaBlock('@media (max-width: 1050px)', '@media (max-height: 690px)')
    const short = mediaBlock('@media (max-height: 690px)', '@media (orientation: portrait)')

    expect(narrow).not.toMatch(/\.hud(?:\b|__)/)
    expect(narrow).not.toContain('.help-fab')
    expect(narrow).not.toContain('.game-screen__logical')
    expect(short).toContain('.game-screen__logical { --short-overlay-scale:')
    expect(short).not.toMatch(/\.gameplay-hud__(?:day|orders|coins|control(?:--pause)?)\s*\{[^}]*var\(--scene-inverse-scale\)/s)
    expect(short).toMatch(/\.help-fab\s*\{[^}]*scale\(var\(--scene-inverse-scale\)\)/)
    expect(short).not.toMatch(/\.game-screen__logical\s*\{[^}]*(?:width|height):/)
  })

  it('keeps the help control above the bottom discard-control band', () => {
    expect(landscapeCss).toContain('.help-fab { right: 18px; bottom: 84px; }')
  })

  it('lets the gameplay viewport shrink below the non-game screen minimum height', () => {
    expect(landscapeCss).toMatch(/\.game-screen\s*\{[^}]*min-height:\s*0;/)
  })

  it('fits the fixed kitchen scene inside all four device safe-area insets', () => {
    const gameScreen = landscapeCss.match(/\.game-screen\s*\{[^}]+\}/s)?.[0] ?? ''
    const safeViewport = landscapeCss.match(/\.game-screen__safe-viewport\s*\{[^}]+\}/s)?.[0] ?? ''
    const logicalScene = landscapeCss.match(/\.game-screen__logical\s*\{[^}]+\}/s)?.[0] ?? ''

    expect(gameScreen).toContain('--game-safe-top: env(safe-area-inset-top, 0px)')
    expect(gameScreen).toContain('--game-safe-right: env(safe-area-inset-right, 0px)')
    expect(gameScreen).toContain('--game-safe-bottom: env(safe-area-inset-bottom, 0px)')
    expect(gameScreen).toContain('--game-safe-left: env(safe-area-inset-left, 0px)')
    expect(safeViewport).toContain('top: var(--game-safe-top)')
    expect(safeViewport).toContain('right: var(--game-safe-right)')
    expect(safeViewport).toContain('bottom: var(--game-safe-bottom)')
    expect(safeViewport).toContain('left: var(--game-safe-left)')
    expect(safeViewport).toContain('place-items: center')
    expect(logicalScene).toContain('position: absolute')
    expect(logicalScene).toContain('left: 50%')
    expect(logicalScene).toContain('top: 50%')
    expect(logicalScene).toContain('transform: translate(-50%, -50%) scale(var(--scene-scale))')
    expect(landscapeCss).toMatch(/\.game-icon\s*\{[^}]*pointer-events:\s*none;/)
    const backdrop = landscapeCss.match(/\.modal-backdrop\s*\{[^}]+\}/s)?.[0] ?? ''
    expect(backdrop).toContain('env(safe-area-inset-top, 0px)')
    expect(backdrop).toContain('env(safe-area-inset-right, 0px)')
    expect(backdrop).toContain('env(safe-area-inset-bottom, 0px)')
    expect(backdrop).toContain('env(safe-area-inset-left, 0px)')
    expect(landscapeCss).toMatch(/\.menu-modal\s*\{[^}]*width:\s*min\(1050px, 100%\)/)
  })

  it('provides a dedicated 844 by 390 campaign shell without desynchronizing summary overlays from their plate', () => {
    const short = mediaBlock('@media (max-height: 690px)', '@media (orientation: portrait)')

    expect(short).toMatch(/\.home-screen[\s\S]*\.select-screen[\s\S]*\.summary-screen[\s\S]*min-height:\s*0/)
    expect(short).toMatch(/\.day-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\)/)
    expect(short).not.toMatch(/\.summary-card\s*\{[^}]*max-height:/)
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
