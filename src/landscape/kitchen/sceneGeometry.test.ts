import { describe, expect, it } from 'vitest'
import { availableIngredients } from '../campaign'
import { INGREDIENT_VISUAL_SLOTS, ingredientTrayPlacement } from './ingredientTrayLayout'
import { INGREDIENT_VISUAL_BOUNDS } from './ingredientVisualBounds'
import {
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
    expect(KITCHEN_RACK_LAYOUTS['approved-2x3']).toMatchObject({ columns: 2, rows: 3 })
    expect(rackRectangles('approved-2x3')).toEqual([
      { left: 98, top: 466, width: 151, height: 76, right: 249, bottom: 542 },
      { left: 249, top: 466, width: 164, height: 76, right: 413, bottom: 542 },
      { left: 50, top: 542, width: 179, height: 86, right: 229, bottom: 628 },
      { left: 229, top: 542, width: 168, height: 86, right: 397, bottom: 628 },
      { left: 15, top: 628, width: 185, height: 100, right: 200, bottom: 728 },
      { left: 200, top: 628, width: 177, height: 100, right: 377, bottom: 728 },
    ])
  })

  it('seats alpha bounds inside the visible well and separates labels on every campaign day', () => {
    expect(Object.keys(INGREDIENT_VISUAL_BOUNDS)).toHaveLength(15)
    for (let day = 1; day <= 6; day++) {
      const ingredients = availableIngredients(day)
      const layout = ingredients.length > 6 ? 'expanded-3x5' : 'approved-2x3'
      ingredients.forEach((id, index) => {
        const { slot, food, image, asset, center } = ingredientTrayPlacement(layout, index, id)
        const mask = rackInnerPolygons(layout)[index]
        const context = day + ':' + id
        expect(food.left, context).toBeGreaterThanOrEqual(mask[0].x)
        expect(food.top, context).toBeGreaterThanOrEqual(mask[0].y)
        expect(food.left + food.width, context).toBeLessThanOrEqual(mask[2].x)
        expect(food.top + food.height, context).toBeLessThanOrEqual(mask[2].y)
        expect(slot.labelAnchor.y - slot.labelFontSize * 1.05 / 2, context).toBeGreaterThanOrEqual(food.top + food.height)
        expect(image.left + asset.center.x / asset.sourceWidth * image.width).toBeCloseTo(center.x, 6)
        expect(image.top + asset.center.y / asset.sourceHeight * image.height).toBeCloseTo(center.y, 6)
        const style = ingredientRackCellStyle(layout, index, id) as Record<string, string>
        expect(parseFloat(style['--ingredient-art-width'])).toBeCloseTo(image.width)
      })
    }
  })

  it('uses independent per-slot footprints and makes the front row larger than the back', () => {
    const slots = INGREDIENT_VISUAL_SLOTS['expanded-3x5']
    expect(new Set(slots.map(s => s.foodScale.width + ':' + s.foodScale.height)).size).toBeGreaterThan(10)
    expect(slots[12].foodScale.width).toBeGreaterThan(slots[0].foodScale.width)
    expect(slots[12].foodScale.height).toBeGreaterThan(slots[0].foodScale.height)
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
      { left: 113.68, top: 469.13, width: 116.27, height: 54.87, right: 229.95, bottom: 524 },
      { left: 229.95, top: 469.13, width: 88.71, height: 54.87, right: 318.66, bottom: 524 },
      { left: 318.66, top: 469.13, width: 94.74, height: 54.87, right: 413.4, bottom: 524 },
      { left: 86.99, top: 524, width: 122.29, height: 52, right: 209.28, bottom: 576 },
      { left: 209.28, top: 524, width: 93.01, height: 52, right: 302.29, bottom: 576 },
      { left: 302.3, top: 524, width: 99.04, height: 52, right: 401.34, bottom: 576 },
      { left: 62.01, top: 576, width: 126.6, height: 56, right: 188.61, bottom: 632 },
      { left: 188.61, top: 576, width: 98.18, height: 56, right: 286.79, bottom: 632 },
      { left: 286.79, top: 576, width: 105.07, height: 56, right: 391.86, bottom: 632 },
      { left: 36.17, top: 632, width: 130.91, height: 60, right: 167.08, bottom: 692 },
      { left: 167.08, top: 632, width: 101.62, height: 60, right: 268.7, bottom: 692 },
      { left: 268.71, top: 632, width: 111.96, height: 60, right: 380.67, bottom: 692 },
      { left: 10.33, top: 692, width: 135.22, height: 64.63, right: 145.55, bottom: 756.63 },
      { left: 145.55, top: 692, width: 108.52, height: 64.63, right: 254.07, bottom: 756.63 },
      { left: 254.07, top: 692, width: 115.41, height: 64.63, right: 369.48, bottom: 756.63 },
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
      '--ingredient-rack-columns': '3',
      '--ingredient-rack-rows': '5',
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
