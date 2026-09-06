import type { IngredientId } from '../campaign'
import { INGREDIENT_VISUAL_BOUNDS } from './ingredientVisualBounds'
import type { Point, RackLayout, Rect } from './sceneGeometry'

export interface IngredientVisualSlot {
  usableRect: Rect
  visualCenter: Point
  anchorPoint: Point
  foodScale: { width: number; height: number }
  foodOffset: Point
  zOrder: number
  labelAnchor: Point
  labelMaxWidth: number
  labelFontSize: number
}

// Measured on the EXISTING 6/15-well plates in 1440×810 scene coordinates.
// The anchor is the food's contact with the floor; labels sit on the front rim.
// Visual placement is independent of the rectangular pointer hit areas.
export const INGREDIENT_VISUAL_SLOTS: Record<RackLayout, readonly IngredientVisualSlot[]> = {
  'approved-2x3': [
    { usableRect: { left: 125, top: 490, width: 120, height: 40 }, visualCenter: { x: 187, y: 513 }, anchorPoint: { x: 185, y: 530 }, foodScale: { width: 110, height: 35 }, foodOffset: { x: -2, y: 0 }, zOrder: 8, labelAnchor: { x: 176, y: 537 }, labelMaxWidth: 108, labelFontSize: 11 },
    { usableRect: { left: 268, top: 490, width: 117, height: 40 }, visualCenter: { x: 326, y: 512 }, anchorPoint: { x: 325, y: 530 }, foodScale: { width: 100, height: 35 }, foodOffset: { x: 0, y: 1 }, zOrder: 8, labelAnchor: { x: 319, y: 537 }, labelMaxWidth: 103, labelFontSize: 11 },
    { usableRect: { left: 88, top: 568, width: 125, height: 45 }, visualCenter: { x: 151, y: 593 }, anchorPoint: { x: 150, y: 614 }, foodScale: { width: 113, height: 38 }, foodOffset: { x: 0, y: 0 }, zOrder: 9, labelAnchor: { x: 141, y: 621 }, labelMaxWidth: 110, labelFontSize: 11.5 },
    { usableRect: { left: 245, top: 568, width: 121, height: 46 }, visualCenter: { x: 304, y: 593 }, anchorPoint: { x: 301, y: 614 }, foodScale: { width: 112, height: 38 }, foodOffset: { x: -1, y: 1 }, zOrder: 9, labelAnchor: { x: 294, y: 622 }, labelMaxWidth: 108, labelFontSize: 11.5 },
    { usableRect: { left: 56, top: 642, width: 119, height: 41 }, visualCenter: { x: 118, y: 663 }, anchorPoint: { x: 116, y: 684 }, foodScale: { width: 112, height: 37 }, foodOffset: { x: -1, y: 1 }, zOrder: 10, labelAnchor: { x: 106, y: 690 }, labelMaxWidth: 112, labelFontSize: 12 },
    { usableRect: { left: 215, top: 650, width: 125, height: 49 }, visualCenter: { x: 278, y: 675 }, anchorPoint: { x: 274, y: 699 }, foodScale: { width: 114, height: 42 }, foodOffset: { x: -1, y: 1 }, zOrder: 10, labelAnchor: { x: 266, y: 705 }, labelMaxWidth: 112, labelFontSize: 12 },
  ],
  'expanded-3x5': [
    { usableRect: { left: 151, top: 486, width: 65, height: 26 }, visualCenter: { x: 184, y: 500 }, anchorPoint: { x: 182, y: 512 }, foodScale: { width: 62, height: 23 }, foodOffset: { x: -1, y: 0 }, zOrder: 8, labelAnchor: { x: 178, y: 517 }, labelMaxWidth: 76, labelFontSize: 10 },
    { usableRect: { left: 242, top: 486, width: 65, height: 26 }, visualCenter: { x: 274, y: 500 }, anchorPoint: { x: 272, y: 512 }, foodScale: { width: 57, height: 24 }, foodOffset: { x: 0, y: 0 }, zOrder: 8, labelAnchor: { x: 268, y: 518 }, labelMaxWidth: 68, labelFontSize: 10 },
    { usableRect: { left: 331, top: 487, width: 66, height: 27 }, visualCenter: { x: 365, y: 501 }, anchorPoint: { x: 363, y: 514 }, foodScale: { width: 61, height: 23 }, foodOffset: { x: -1, y: 0 }, zOrder: 8, labelAnchor: { x: 360, y: 519 }, labelMaxWidth: 70, labelFontSize: 10 },
    { usableRect: { left: 125, top: 534, width: 73, height: 28 }, visualCenter: { x: 162, y: 549 }, anchorPoint: { x: 160, y: 562 }, foodScale: { width: 68, height: 26 }, foodOffset: { x: 0, y: 0 }, zOrder: 9, labelAnchor: { x: 154, y: 568 }, labelMaxWidth: 74, labelFontSize: 10 },
    { usableRect: { left: 220, top: 535, width: 72, height: 28 }, visualCenter: { x: 256, y: 550 }, anchorPoint: { x: 254, y: 563 }, foodScale: { width: 66, height: 26 }, foodOffset: { x: 0, y: 0 }, zOrder: 9, labelAnchor: { x: 249, y: 569 }, labelMaxWidth: 76, labelFontSize: 10 },
    { usableRect: { left: 312, top: 536, width: 74, height: 28 }, visualCenter: { x: 349, y: 551 }, anchorPoint: { x: 347, y: 564 }, foodScale: { width: 68, height: 26 }, foodOffset: { x: 0, y: 0 }, zOrder: 9, labelAnchor: { x: 343, y: 570 }, labelMaxWidth: 76, labelFontSize: 10 },
    { usableRect: { left: 103, top: 585, width: 75, height: 34 }, visualCenter: { x: 141, y: 603 }, anchorPoint: { x: 139, y: 619 }, foodScale: { width: 70, height: 30 }, foodOffset: { x: -1, y: 0 }, zOrder: 10, labelAnchor: { x: 129, y: 624 }, labelMaxWidth: 80, labelFontSize: 10.5 },
    { usableRect: { left: 201, top: 586, width: 76, height: 34 }, visualCenter: { x: 239, y: 604 }, anchorPoint: { x: 237, y: 620 }, foodScale: { width: 71, height: 29 }, foodOffset: { x: 0, y: 1 }, zOrder: 10, labelAnchor: { x: 227, y: 625 }, labelMaxWidth: 86, labelFontSize: 10 },
    { usableRect: { left: 298, top: 586, width: 76, height: 34 }, visualCenter: { x: 336, y: 604 }, anchorPoint: { x: 334, y: 620 }, foodScale: { width: 72, height: 30 }, foodOffset: { x: 0, y: 0 }, zOrder: 10, labelAnchor: { x: 325, y: 626 }, labelMaxWidth: 91, labelFontSize: 8.8 },
    { usableRect: { left: 76, top: 643, width: 80, height: 34 }, visualCenter: { x: 117, y: 662 }, anchorPoint: { x: 114, y: 677 }, foodScale: { width: 73, height: 30 }, foodOffset: { x: -1, y: 0 }, zOrder: 11, labelAnchor: { x: 102, y: 685 }, labelMaxWidth: 82, labelFontSize: 11 },
    { usableRect: { left: 178, top: 644, width: 79, height: 34 }, visualCenter: { x: 218, y: 663 }, anchorPoint: { x: 216, y: 678 }, foodScale: { width: 74, height: 31 }, foodOffset: { x: 0, y: 0 }, zOrder: 11, labelAnchor: { x: 205, y: 685 }, labelMaxWidth: 84, labelFontSize: 11 },
    { usableRect: { left: 280, top: 645, width: 79, height: 34 }, visualCenter: { x: 320, y: 664 }, anchorPoint: { x: 318, y: 679 }, foodScale: { width: 75, height: 30 }, foodOffset: { x: -1, y: 0 }, zOrder: 11, labelAnchor: { x: 309, y: 685 }, labelMaxWidth: 90, labelFontSize: 10 },
    { usableRect: { left: 50, top: 706, width: 83, height: 34 }, visualCenter: { x: 92, y: 724 }, anchorPoint: { x: 90, y: 740 }, foodScale: { width: 78, height: 31 }, foodOffset: { x: 0, y: 0 }, zOrder: 12, labelAnchor: { x: 78, y: 746 }, labelMaxWidth: 88, labelFontSize: 11 },
    { usableRect: { left: 158, top: 707, width: 83, height: 34 }, visualCenter: { x: 200, y: 725 }, anchorPoint: { x: 198, y: 741 }, foodScale: { width: 77, height: 32 }, foodOffset: { x: -1, y: 0 }, zOrder: 12, labelAnchor: { x: 188, y: 747 }, labelMaxWidth: 91, labelFontSize: 10.5 },
    { usableRect: { left: 267, top: 707, width: 82, height: 34 }, visualCenter: { x: 309, y: 725 }, anchorPoint: { x: 307, y: 741 }, foodScale: { width: 75, height: 32 }, foodOffset: { x: -1, y: 0 }, zOrder: 12, labelAnchor: { x: 297, y: 748 }, labelMaxWidth: 90, labelFontSize: 11 },
  ],
}

export function ingredientTrayPlacement(layout: RackLayout, index: number, id: IngredientId) {
  const slot = INGREDIENT_VISUAL_SLOTS[layout][index]
  if (!slot) throw new Error(`Missing visual slot ${layout}:${index}`)
  const asset = INGREDIENT_VISUAL_BOUNDS[id]
  const sx = slot.foodScale.width / asset.bounds.width
  const sy = slot.foodScale.height / asset.bounds.height
  const center = { x: slot.visualCenter.x + slot.foodOffset.x, y: slot.visualCenter.y + slot.foodOffset.y }
  // Place the alpha-weighted center, not the center of the transparent DOM box.
  const image = { left: center.x - asset.center.x * sx, top: center.y - asset.center.y * sy, width: asset.sourceWidth * sx, height: asset.sourceHeight * sy }
  const food = { left: image.left + asset.bounds.left * sx, top: image.top + asset.bounds.top * sy, width: slot.foodScale.width, height: slot.foodScale.height }
  return { slot, asset, image, food, center }
}
