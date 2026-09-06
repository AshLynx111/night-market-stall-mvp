import { describe, expect, it } from 'vitest'
import {
  INGREDIENT_ART_PLACEMENTS,
  KITCHEN_GHOST_GEOMETRY,
  KITCHEN_GRIDDLE_RECTS,
  KITCHEN_GRIDDLE_USABLE_RECTS,
  KITCHEN_RACK_LAYOUTS,
  ghostInnerPolygon,
  ingredientRackCellStyle,
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

  it('defines independent measured cooking surfaces without changing interaction rectangles', () => {
    expect(KITCHEN_GRIDDLE_USABLE_RECTS).toEqual({
      left: { left: 500, top: 510, width: 310, height: 190 },
      right: { left: 850, top: 510, width: 310, height: 190 },
    })
    expect(rectCenter(KITCHEN_GRIDDLE_USABLE_RECTS.left)).toEqual({ x: 655, y: 605 })
    expect(rectCenter(KITCHEN_GRIDDLE_USABLE_RECTS.right)).toEqual({ x: 1005, y: 605 })
    expect(rectCenter(KITCHEN_GRIDDLE_USABLE_RECTS.left)).not.toEqual(rectCenter(KITCHEN_GRIDDLE_RECTS.left))
    expect(rectCenter(KITCHEN_GRIDDLE_USABLE_RECTS.right)).not.toEqual(rectCenter(KITCHEN_GRIDDLE_RECTS.right))
  })

  it('calculates the six approved 2 by 3 rack control rectangles', () => {
    expect(KITCHEN_RACK_LAYOUTS['approved-2x3']).toMatchObject({
      left: 80,
      top: 466,
      columnGap: 155,
      rowGap: 75,
      width: 150,
      height: 70,
    })
    expect(rackRectangles('approved-2x3')).toEqual([
      { left: 80, top: 466, width: 150, height: 70, right: 230, bottom: 536 },
      { left: 235, top: 466, width: 150, height: 70, right: 385, bottom: 536 },
      { left: 80, top: 541, width: 150, height: 70, right: 230, bottom: 611 },
      { left: 235, top: 541, width: 150, height: 70, right: 385, bottom: 611 },
      { left: 80, top: 616, width: 150, height: 70, right: 230, bottom: 686 },
      { left: 235, top: 616, width: 150, height: 70, right: 385, bottom: 686 },
    ])
  })

  it('maps the Day 1 rack to six measured floor polygons that widen toward the foreground', () => {
    const polygons = rackInnerPolygons('approved-2x3')

    expect(polygons).toEqual([
      [{ x: 112, y: 488 }, { x: 232, y: 488 }, { x: 216, y: 531 }, { x: 100, y: 531 }],
      [{ x: 266, y: 488 }, { x: 387, y: 488 }, { x: 372, y: 532 }, { x: 252, y: 532 }],
      [{ x: 88, y: 562 }, { x: 220, y: 562 }, { x: 193, y: 607 }, { x: 67, y: 607 }],
      [{ x: 248, y: 562 }, { x: 381, y: 562 }, { x: 359, y: 608 }, { x: 234, y: 608 }],
      [{ x: 48, y: 637 }, { x: 200, y: 637 }, { x: 174, y: 687 }, { x: 25, y: 687 }],
      [{ x: 228, y: 637 }, { x: 369, y: 637 }, { x: 344, y: 690 }, { x: 214, y: 690 }],
    ])
    const widths = polygons.map((polygon) => Math.max(...polygon.map(({ x }) => x)) - Math.min(...polygon.map(({ x }) => x)) )
    expect(widths[4]).toBeGreaterThan(widths[2])
    expect(widths[2]).toBeGreaterThan(widths[0])
  })

  it('provides a visual placement profile for every gameplay ingredient', () => {
    expect(Object.keys(INGREDIENT_ART_PLACEMENTS)).toHaveLength(15)
    expect(INGREDIENT_ART_PLACEMENTS).toMatchObject({
      noodle: { width: 90, perspectiveY: .62, centerX: 50, centerY: 51 },
      egg: { width: 96, perspectiveY: .68 },
      'hot-dog': { width: 96, perspectiveY: .64, centerX: 48 },
      sauce: { width: 96, perspectiveY: .62 },
      scallion: { width: 100, perspectiveY: .68 },
    })

    const style = ingredientRackCellStyle('approved-2x3', 0, 'noodle') as Record<string, string>
    expect(style).toMatchObject({
      '--ingredient-art-width': '90%',
      '--ingredient-art-perspective-y': '0.62',
      '--ingredient-art-center-x': '50%',
      '--ingredient-art-center-y': '51%',
      '--ingredient-contact-width': '76%',
      '--ingredient-contact-height': '24%',
    })
    expect(style['--ingredient-rack-label-left']).toBe('85px')
    expect(style['--ingredient-rack-label-top']).toBe('55px')

    const foregroundStyle = ingredientRackCellStyle('approved-2x3', 4, 'scallion') as Record<string, string>
    expect(foregroundStyle).toMatchObject({
      '--ingredient-rack-control-left': '80px',
      '--ingredient-rack-control-top': '616px',
      '--ingredient-rack-control-width': '150px',
      '--ingredient-rack-control-height': '70px',
      '--ingredient-rack-inner-left': '-55px',
      '--ingredient-rack-inner-top': '21px',
      '--ingredient-rack-inner-width': '175px',
      '--ingredient-rack-inner-height': '50px',
      '--ingredient-rack-label-left': '31.75px',
      '--ingredient-rack-label-top': '61px',
    })
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

  it('defines canonical expanded-3x5 inner polygons strictly inside every control', () => {
    const controls = rackRectangles('expanded-3x5')
    const innerPolygons = rackInnerPolygons('expanded-3x5')

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
      '--griddle-left-usable-left': '500px',
      '--griddle-left-usable-top': '510px',
      '--griddle-left-usable-width': '310px',
      '--griddle-left-usable-height': '190px',
      '--griddle-left-usable-local-center-x': '164px',
      '--griddle-left-usable-local-center-y': '46px',
      '--griddle-right-usable-left': '850px',
      '--griddle-right-usable-top': '510px',
      '--griddle-right-usable-width': '310px',
      '--griddle-right-usable-height': '190px',
      '--griddle-right-usable-local-center-x': '245px',
      '--griddle-right-usable-local-center-y': '46px',
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
