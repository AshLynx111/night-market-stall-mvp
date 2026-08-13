import { describe, expect, it } from 'vitest'
import {
  KITCHEN_GRIDDLE_RECTS,
  KITCHEN_RACK_LAYOUTS,
  kitchenGeometryStyle,
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
      '--ingredient-rack-left': '18px',
      '--ingredient-rack-top': '466px',
      '--ingredient-rack-column-gap': '102px',
      '--ingredient-rack-row-gap': '65px',
      '--ingredient-rack-control-width': '98px',
      '--ingredient-rack-control-height': '61px',
      '--ingredient-rack-columns': '3',
      '--ingredient-rack-rows': '5',
    })
  })
})
