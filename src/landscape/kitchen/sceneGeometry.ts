import type { CSSProperties } from 'react'
import type { IngredientId } from '../campaign'
import type { SlotId } from './types'
import { INGREDIENT_VISUAL_SLOTS, ingredientTrayPlacement } from './ingredientTrayLayout'

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface InnerMaskGeometry extends Rect {
  clip: readonly Point[]
}

export interface RackGeometry {
  columns: number
  rows: number
  cells: readonly RackCellGeometry[]
}

export interface RackCellGeometry {
  control: Rect
}


export type RackLayout = 'approved-2x3' | 'expanded-3x5'

export interface RackRectangle extends Rect {
  right: number
  bottom: number
}

export const KITCHEN_GRIDDLE_RECTS: Record<SlotId, Rect> = {
  left: { left: 491, top: 559, width: 269, height: 218 },
  right: { left: 760, top: 559, width: 269, height: 218 },
}

// Measured from the dark cooking planes in the approved 1440×810 kitchen plate.
// Interaction hitboxes above intentionally stay unchanged.
export const KITCHEN_GRIDDLE_USABLE_RECTS: Record<SlotId, Rect> = {
  left: { left: 500, top: 510, width: 310, height: 190 },
  right: { left: 850, top: 510, width: 310, height: 190 },
}

// Each layout follows the metal wells painted into its approved kitchen plate.
export const KITCHEN_RACK_LAYOUTS: Record<RackLayout, RackGeometry> = {
  'approved-2x3': {
    columns: 2,
    rows: 3,
    cells: [
      { control: { left: 98, top: 466, width: 151, height: 76 } },
      { control: { left: 249, top: 466, width: 164, height: 76 } },
      { control: { left: 50, top: 542, width: 179, height: 86 } },
      { control: { left: 229, top: 542, width: 168, height: 86 } },
      { control: { left: 15, top: 628, width: 185, height: 100 } },
      { control: { left: 200, top: 628, width: 177, height: 100 } },
    ],
  },
  'expanded-3x5': {
    columns: 3,
    rows: 5,
    cells: [
      { control: { left: 113.68, top: 469.13, width: 116.27, height: 54.87 } },
      { control: { left: 229.95, top: 469.13, width: 88.71, height: 54.87 } },
      { control: { left: 318.66, top: 469.13, width: 94.74, height: 54.87 } },
      { control: { left: 86.99, top: 524, width: 122.29, height: 52 } },
      { control: { left: 209.28, top: 524, width: 93.01, height: 52 } },
      { control: { left: 302.3, top: 524, width: 99.04, height: 52 } },
      { control: { left: 62.01, top: 576, width: 126.6, height: 56 } },
      { control: { left: 188.61, top: 576, width: 98.18, height: 56 } },
      { control: { left: 286.79, top: 576, width: 105.07, height: 56 } },
      { control: { left: 36.17, top: 632, width: 130.91, height: 60 } },
      { control: { left: 167.08, top: 632, width: 101.62, height: 60 } },
      { control: { left: 268.71, top: 632, width: 111.96, height: 60 } },
      { control: { left: 10.33, top: 692, width: 135.22, height: 64.63 } },
      { control: { left: 145.55, top: 692, width: 108.52, height: 64.63 } },
      { control: { left: 254.07, top: 692, width: 115.41, height: 64.63 } },
    ],
  },
}

export const KITCHEN_GHOST_GEOMETRY = {
  width: 112,
  height: 70,
  inner: {
    left: 8,
    top: 6,
    width: 96,
    height: 54,
    clip: [
      { x: .09, y: .02 },
      { x: .91, y: .02 },
      { x: .99, y: .94 },
      { x: .01, y: .94 },
    ],
  },
} as const

export function rectCenter(rect: Rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

export function rackRectangles(layout: RackLayout): RackRectangle[] {
  return KITCHEN_RACK_LAYOUTS[layout].cells.map(({ control }) => ({
    ...control,
    right: Number((control.left + control.width).toFixed(2)),
    bottom: Number((control.top + control.height).toFixed(2)),
  }))
}

function translatedInnerPolygon(origin: Pick<Rect, 'left' | 'top'>, inner: InnerMaskGeometry): Point[] {
  return inner.clip.map((point) => ({
    x: origin.left + inner.left + point.x * inner.width,
    y: origin.top + inner.top + point.y * inner.height,
  }))
}

export function rackInnerPolygons(layout: RackLayout): Point[][] {
  return INGREDIENT_VISUAL_SLOTS[layout].map(({ usableRect: r }) => [
    { x: r.left - 2, y: r.top - 2 }, { x: r.left + r.width + 2, y: r.top - 2 },
    { x: r.left + r.width + 2, y: r.top + r.height + 2 }, { x: r.left - 2, y: r.top + r.height + 2 },
  ])
}

export function ingredientRackCellStyle(layout: RackLayout, index: number, ingredientId: IngredientId): CSSProperties {
  const control = rackRectangles(layout)[index]
  const { slot, image, food } = ingredientTrayPlacement(layout, index, ingredientId)
  const inner = slot.usableRect
  const px = (value: number) => `${value}px`
  return {
    '--ingredient-rack-control-left': px(control.left),
    '--ingredient-rack-control-top': px(control.top),
    '--ingredient-rack-control-width': px(control.width),
    '--ingredient-rack-control-height': px(control.height),
    '--ingredient-rack-inner-left': px(inner.left - control.left - 2),
    '--ingredient-rack-inner-top': px(inner.top - control.top - 2),
    '--ingredient-rack-inner-width': px(inner.width + 4),
    '--ingredient-rack-inner-height': px(inner.height + 4),
    '--ingredient-rack-inner-clip': '0% 0%, 100% 0%, 100% 100%, 0% 100%',
    '--ingredient-rack-z': String(slot.zOrder),
    '--ingredient-rack-label-left': px(slot.labelAnchor.x - control.left),
    '--ingredient-rack-label-top': px(slot.labelAnchor.y - control.top),
    '--ingredient-label-width': px(slot.labelMaxWidth),
    '--ingredient-label-font': px(slot.labelFontSize),
    '--ingredient-art-left': px(image.left - inner.left + 2),
    '--ingredient-art-top': px(image.top - inner.top + 2),
    '--ingredient-art-width': px(image.width),
    '--ingredient-art-height': px(image.height),
    '--ingredient-contact-left': px(slot.anchorPoint.x - inner.left + 2),
    '--ingredient-contact-top': px(Math.min(food.top + food.height * .76, slot.anchorPoint.y) - inner.top + 2),
    '--ingredient-contact-width': px(food.width * 1.02),
    '--ingredient-contact-height': px(food.height * .5),
  } as CSSProperties
}

export function ghostInnerPolygon(): Point[] {
  return translatedInnerPolygon({ left: 0, top: 0 }, KITCHEN_GHOST_GEOMETRY.inner)
}

function clipPath(points: readonly Point[]) {
  return points.map((point) => `${point.x * 100}% ${point.y * 100}%`).join(', ')
}

type KitchenGeometryVariables = Record<`--griddle-${string}` | `--ingredient-rack-${string}`, string>

export function kitchenGeometryStyle(layout: RackLayout): CSSProperties {
  const rack = KITCHEN_RACK_LAYOUTS[layout]
  const pixel = (value: number) => `${value}px`
  const griddleVariables = Object.entries(KITCHEN_GRIDDLE_RECTS).flatMap(([slotId, rect]) => [
    [`--griddle-${slotId}-left`, pixel(rect.left)],
    [`--griddle-${slotId}-top`, pixel(rect.top)],
    [`--griddle-${slotId}-width`, pixel(rect.width)],
    [`--griddle-${slotId}-height`, pixel(rect.height)],
  ])
  const usableVariables = Object.entries(KITCHEN_GRIDDLE_USABLE_RECTS).flatMap(([slotId, rect]) => {
    const control = KITCHEN_GRIDDLE_RECTS[slotId as SlotId]
    const center = rectCenter(rect)
    return [
      [`--griddle-${slotId}-usable-left`, pixel(rect.left)],
      [`--griddle-${slotId}-usable-top`, pixel(rect.top)],
      [`--griddle-${slotId}-usable-width`, pixel(rect.width)],
      [`--griddle-${slotId}-usable-height`, pixel(rect.height)],
      [`--griddle-${slotId}-usable-local-center-x`, pixel(center.x - control.left)],
      [`--griddle-${slotId}-usable-local-center-y`, pixel(center.y - control.top)],
    ]
  })

  return {
    ...Object.fromEntries(griddleVariables),
    ...Object.fromEntries(usableVariables),
    '--ingredient-rack-columns': String(rack.columns),
    '--ingredient-rack-rows': String(rack.rows),
  } as KitchenGeometryVariables as CSSProperties
}

export function ingredientGhostGeometryStyle(): CSSProperties {
  const { inner } = KITCHEN_GHOST_GEOMETRY
  return {
    '--ingredient-ghost-width': `${KITCHEN_GHOST_GEOMETRY.width}px`,
    '--ingredient-ghost-height': `${KITCHEN_GHOST_GEOMETRY.height}px`,
    '--ingredient-ghost-inner-left': `${inner.left}px`,
    '--ingredient-ghost-inner-top': `${inner.top}px`,
    '--ingredient-ghost-inner-width': `${inner.width}px`,
    '--ingredient-ghost-inner-height': `${inner.height}px`,
    '--ingredient-ghost-inner-clip': clipPath(inner.clip),
  } as CSSProperties
}
