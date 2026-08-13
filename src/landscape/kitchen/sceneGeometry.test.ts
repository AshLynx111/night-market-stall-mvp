import { describe, expect, it } from 'vitest'
import {
  KITCHEN_GHOST_GEOMETRY,
  KITCHEN_GRIDDLE_RECTS,
  KITCHEN_RACK_LAYOUTS,
  ghostInnerPolygon,
  kitchenGeometryStyle,
  rackInnerPolygons,
  rackRectangles,
  rectCenter,
} from './sceneGeometry'

describe('canonical kitchen scene geometry', () => {
  it('defines the approved griddle rectangles and left center', () => {
    expect(KITCHEN_GRIDDLE_RECTS.left).toEqual({ left: 491, top: 559, width: 269, height: 218 })
    expect(KITCHEN_GRIDDLE_RECTS.right).toEqual({ left: 760, top: 559, width: 269, height: 218 })
    expect(rectCenter(KITCHEN_GRIDDLE_RECTS.left)).toEqual({ x: 625.5, y: 668 })
  })

  it('calculates the six approved 2 by 3 rack control rectangles', () => {
    expect(rackRectangles('approved-2x3')).toEqual([
      { left: 80, top: 466, width: 150, height: 70, right: 230, bottom: 536 },
      { left: 235, top: 466, width: 150, height: 70, right: 385, bottom: 536 },
      { left: 80, top: 541, width: 150, height: 70, right: 230, bottom: 611 },
      { left: 235, top: 541, width: 150, height: 70, right: 385, bottom: 611 },
      { left: 80, top: 616, width: 150, height: 70, right: 230, bottom: 686 },
      { left: 235, top: 616, width: 150, height: 70, right: 385, bottom: 686 },
    ])
  })

  it('keeps every expanded rack control disjoint, left of the left griddle, and within the scene', () => {
    const rectangles = rackRectangles('expanded-3x5')

    expect(rectangles).toHaveLength(15)
    expect(rectangles.every((rect) => rect.right < KITCHEN_GRIDDLE_RECTS.left.left && rect.bottom <= 810)).toBe(true)
    rectangles.forEach((rect, index) => {
      rectangles.slice(index + 1).forEach((other) => {
        const overlaps = rect.left < other.right && rect.right > other.left
          && rect.top < other.bottom && rect.bottom > other.top
        expect(overlaps).toBe(false)
      })
    })
  })

  it('maps the expanded rack to fifteen measured perspective wells instead of a nominal uniform grid', () => {
    const rectangles = rackRectangles('expanded-3x5')
    const innerPolygons = rackInnerPolygons('expanded-3x5')

    expect(rectangles).toEqual([
      { left: 113.68, top: 469.13, width: 116.27, height: 53.37, right: 229.95, bottom: 522.5 },
      { left: 229.95, top: 469.13, width: 88.71, height: 53.37, right: 318.66, bottom: 522.5 },
      { left: 318.66, top: 469.13, width: 94.74, height: 53.37, right: 413.4, bottom: 522.5 },
      { left: 86.99, top: 522.5, width: 122.29, height: 49.06, right: 209.28, bottom: 571.56 },
      { left: 209.28, top: 522.5, width: 93.01, height: 49.06, right: 302.29, bottom: 571.56 },
      { left: 302.3, top: 522.5, width: 99.04, height: 49.06, right: 401.34, bottom: 571.56 },
      { left: 62.01, top: 571.56, width: 126.6, height: 55.95, right: 188.61, bottom: 627.51 },
      { left: 188.61, top: 571.56, width: 98.18, height: 55.95, right: 286.79, bottom: 627.51 },
      { left: 286.79, top: 571.56, width: 105.07, height: 55.95, right: 391.86, bottom: 627.51 },
      { left: 36.17, top: 627.51, width: 130.91, height: 61.12, right: 167.08, bottom: 688.63 },
      { left: 167.08, top: 627.51, width: 101.62, height: 61.12, right: 268.7, bottom: 688.63 },
      { left: 268.71, top: 627.51, width: 111.96, height: 61.12, right: 380.67, bottom: 688.63 },
      { left: 10.33, top: 688.63, width: 135.22, height: 68, right: 145.55, bottom: 756.63 },
      { left: 145.55, top: 688.63, width: 108.52, height: 68, right: 254.07, bottom: 756.63 },
      { left: 254.07, top: 688.63, width: 115.41, height: 68, right: 369.48, bottom: 756.63 },
    ])
    expect(innerPolygons).toHaveLength(15)
    expect(new Set(rectangles.map((rectangle) => `${rectangle.left}:${rectangle.top}:${rectangle.width}:${rectangle.height}`)).size)
      .toBeGreaterThan(5)
    expect(rectangles[0].top).toBeLessThan(rectangles[12].top)
    expect(rectangles[0].width).toBeLessThan(rectangles[12].width)
    expect(innerPolygons.every((polygon, index) => polygon.every((point) => {
      const control = rectangles[index]
      return point.x > control.left && point.x < control.right && point.y > control.top && point.y < control.bottom
    }))).toBe(true)
  })

  it.each(['approved-2x3', 'expanded-3x5'] as const)('defines canonical %s inner polygons strictly inside every control', (layout) => {
    const controls = rackRectangles(layout)
    const innerPolygons = rackInnerPolygons(layout)

    expect(innerPolygons).toHaveLength(controls.length)
    innerPolygons.forEach((polygon, index) => {
      const control = controls[index]
      expect(polygon).toHaveLength(4)
      expect(polygon.every((point) => point.x > control.left && point.x < control.right)).toBe(true)
      expect(polygon.every((point) => point.y > control.top && point.y < control.bottom)).toBe(true)
    })
  })

  it('defines a cropped food-only drag mask with positive inset on every side', () => {
    const polygon = ghostInnerPolygon()

    expect(polygon).toHaveLength(4)
    expect(polygon.every((point) => point.x > 0 && point.x < KITCHEN_GHOST_GEOMETRY.width)).toBe(true)
    expect(polygon.every((point) => point.y > 0 && point.y < KITCHEN_GHOST_GEOMETRY.height)).toBe(true)
  })

  it('serializes the selected rack and both griddles as exact CSS custom-property pixels', () => {
    const style = kitchenGeometryStyle('expanded-3x5') as Record<string, string>

    expect(KITCHEN_RACK_LAYOUTS['expanded-3x5']).toMatchObject({ columns: 3, rows: 5 })
    expect(style).toMatchObject({
      '--griddle-left-left': '491px',
      '--griddle-left-top': '559px',
      '--griddle-left-width': '269px',
      '--griddle-left-height': '218px',
      '--griddle-right-left': '760px',
      '--griddle-right-top': '559px',
      '--griddle-right-width': '269px',
      '--griddle-right-height': '218px',
      '--ingredient-rack-left': '10.33px',
      '--ingredient-rack-top': '469.13px',
      '--ingredient-rack-column-gap': '0px',
      '--ingredient-rack-row-gap': '0px',
      '--ingredient-rack-control-width': '403.07px',
      '--ingredient-rack-control-height': '287.5px',
      '--ingredient-rack-columns': '3',
      '--ingredient-rack-rows': '5',
      '--ingredient-rack-inner-left': '0px',
      '--ingredient-rack-inner-top': '0px',
      '--ingredient-rack-inner-width': '1px',
      '--ingredient-rack-inner-height': '1px',
      '--ingredient-rack-inner-clip': '0% 0%, 100% 0%, 100% 100%, 0% 100%',
    })
  })

  it('publishes each griddle rectangle as the shared positioning variables for every cooking layer', () => {
    const style = kitchenGeometryStyle('approved-2x3') as Record<string, string>

    for (const [slotId, rect] of Object.entries(KITCHEN_GRIDDLE_RECTS)) {
      expect(style[`--griddle-${slotId}-left`]).toBe(`${rect.left}px`)
      expect(style[`--griddle-${slotId}-top`]).toBe(`${rect.top}px`)
      expect(style[`--griddle-${slotId}-width`]).toBe(`${rect.width}px`)
      expect(style[`--griddle-${slotId}-height`]).toBe(`${rect.height}px`)
    }
  })
})
