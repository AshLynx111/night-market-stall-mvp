import type { CSSProperties } from 'react'
import type { IngredientId } from '../campaign'
import type { SlotId } from './types'

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

export interface RackGeometry extends Rect {
  columns: number
  rows: number
  columnGap: number
  rowGap: number
  inner: InnerMaskGeometry
  cells?: readonly RackCellGeometry[]
}

export interface RackCellGeometry {
  control: Rect
  inner: readonly Point[]
}

export interface IngredientArtPlacement {
  width: number
  perspectiveY: number
  centerX: number
  centerY: number
  contactWidth: number
  contactHeight: number
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

// Each source is a 512×512 transparent image with different painted bounds.
// These profiles normalize the painted food footprint to the perspective floor.
export const INGREDIENT_ART_PLACEMENTS: Record<IngredientId, IngredientArtPlacement> = {
  noodle: { width: 90, perspectiveY: .62, centerX: 50, centerY: 51, contactWidth: 76, contactHeight: 24 },
  egg: { width: 96, perspectiveY: .68, centerX: 49.5, centerY: 52, contactWidth: 70, contactHeight: 24 },
  'hot-dog': { width: 96, perspectiveY: .64, centerX: 48, centerY: 51, contactWidth: 72, contactHeight: 22 },
  sauce: { width: 96, perspectiveY: .62, centerX: 50, centerY: 51, contactWidth: 78, contactHeight: 22 },
  scallion: { width: 100, perspectiveY: .68, centerX: 50, centerY: 52, contactWidth: 70, contactHeight: 24 },
  cilantro: { width: 92, perspectiveY: .68, centerX: 50, centerY: 51, contactWidth: 70, contactHeight: 23 },
  onion: { width: 94, perspectiveY: .66, centerX: 50, centerY: 51, contactWidth: 72, contactHeight: 23 },
  'chili-powder': { width: 98, perspectiveY: .65, centerX: 49.5, centerY: 51, contactWidth: 72, contactHeight: 22 },
  'turkey-noodle': { width: 98, perspectiveY: .64, centerX: 49, centerY: 51, contactWidth: 74, contactHeight: 22 },
  cheese: { width: 94, perspectiveY: .65, centerX: 48.5, centerY: 51, contactWidth: 72, contactHeight: 22 },
  corn: { width: 104, perspectiveY: .7, centerX: 50, centerY: 52, contactWidth: 68, contactHeight: 24 },
  orleans: { width: 92, perspectiveY: .62, centerX: 50, centerY: 51, contactWidth: 76, contactHeight: 22 },
  bacon: { width: 90, perspectiveY: .62, centerX: 49, centerY: 50, contactWidth: 76, contactHeight: 22 },
  tenderloin: { width: 92, perspectiveY: .64, centerX: 50, centerY: 51, contactWidth: 76, contactHeight: 22 },
  enoki: { width: 104, perspectiveY: .72, centerX: 49.5, centerY: 53, contactWidth: 68, contactHeight: 24 },
}

// Each layout follows the metal wells painted into its approved kitchen plate.
export const KITCHEN_RACK_LAYOUTS: Record<RackLayout, RackGeometry> = {
  'approved-2x3': {
    columns: 2,
    rows: 3,
    left: 80,
    top: 466,
    columnGap: 155,
    rowGap: 75,
    width: 150,
    height: 70,
    inner: {
      left: 12,
      top: 7,
      width: 126,
      height: 52,
      clip: [
        { x: .09, y: .02 },
        { x: .91, y: .02 },
        { x: .99, y: .94 },
        { x: .01, y: .94 },
      ],
    },
    cells: [
      { control: { left: 80, top: 466, width: 150, height: 70 }, inner: [{ x: 112, y: 488 }, { x: 232, y: 488 }, { x: 216, y: 531 }, { x: 100, y: 531 }] },
      { control: { left: 235, top: 466, width: 150, height: 70 }, inner: [{ x: 266, y: 488 }, { x: 387, y: 488 }, { x: 372, y: 532 }, { x: 252, y: 532 }] },
      { control: { left: 80, top: 541, width: 150, height: 70 }, inner: [{ x: 88, y: 562 }, { x: 220, y: 562 }, { x: 193, y: 607 }, { x: 67, y: 607 }] },
      { control: { left: 235, top: 541, width: 150, height: 70 }, inner: [{ x: 248, y: 562 }, { x: 381, y: 562 }, { x: 359, y: 608 }, { x: 234, y: 608 }] },
      { control: { left: 80, top: 616, width: 150, height: 70 }, inner: [{ x: 48, y: 637 }, { x: 200, y: 637 }, { x: 174, y: 687 }, { x: 25, y: 687 }] },
      { control: { left: 235, top: 616, width: 150, height: 70 }, inner: [{ x: 228, y: 637 }, { x: 369, y: 637 }, { x: 344, y: 690 }, { x: 214, y: 690 }] },
    ],
  },
  'expanded-3x5': {
    columns: 3,
    rows: 5,
    // Aggregate fields describe the measured rack envelope; positioning uses
    // the explicit perspective cells below, never nominal grid arithmetic.
    left: 10.33,
    top: 469.13,
    columnGap: 0,
    rowGap: 0,
    width: 403.07,
    height: 287.5,
    inner: {
      left: 0,
      top: 0,
      width: 1,
      height: 1,
      clip: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    },
    cells: [
      { control: { left: 113.68, top: 469.13, width: 116.27, height: 53.37 }, inner: [{ x: 152.44, y: 482.04 }, { x: 219.62, y: 482.04 }, { x: 225.65, y: 500.12 }, { x: 145.55, y: 500.12 }] },
      { control: { left: 229.95, top: 469.13, width: 88.71, height: 53.37 }, inner: [{ x: 241.15, y: 482.04 }, { x: 308.33, y: 482.04 }, { x: 314.35, y: 500.12 }, { x: 234.26, y: 500.12 }] },
      { control: { left: 318.66, top: 469.13, width: 94.74, height: 53.37 }, inner: [{ x: 329.86, y: 482.9 }, { x: 396.17, y: 482.9 }, { x: 402.2, y: 500.98 }, { x: 322.97, y: 500.98 }] },
      { control: { left: 86.99, top: 522.5, width: 122.29, height: 49.06 }, inner: [{ x: 128.33, y: 529.38 }, { x: 198.09, y: 529.38 }, { x: 204.98, y: 549.18 }, { x: 119.71, y: 549.18 }] },
      { control: { left: 209.28, top: 522.5, width: 93.01, height: 49.06 }, inner: [{ x: 220.48, y: 529.38 }, { x: 291.1, y: 529.38 }, { x: 297.99, y: 550.04 }, { x: 212.73, y: 550.04 }] },
      { control: { left: 302.3, top: 522.5, width: 99.04, height: 49.06 }, inner: [{ x: 313.49, y: 530.24 }, { x: 384.11, y: 530.24 }, { x: 391, y: 550.04 }, { x: 305.74, y: 550.04 }] },
      { control: { left: 62.01, top: 571.56, width: 126.6, height: 55.95 }, inner: [{ x: 102.49, y: 580.17 }, { x: 181.72, y: 580.17 }, { x: 184.31, y: 602.55 }, { x: 96.46, y: 602.55 }] },
      { control: { left: 188.61, top: 571.56, width: 98.18, height: 55.95 }, inner: [{ x: 198.09, y: 580.17 }, { x: 278.18, y: 580.17 }, { x: 282.49, y: 602.55 }, { x: 192.92, y: 602.55 }] },
      { control: { left: 286.79, top: 571.56, width: 105.07, height: 55.95 }, inner: [{ x: 295.41, y: 581.03 }, { x: 375.5, y: 581.03 }, { x: 378.95, y: 603.41 }, { x: 290.24, y: 603.41 }] },
      { control: { left: 36.17, top: 627.51, width: 130.91, height: 61.12 }, inner: [{ x: 74.93, y: 638.7 }, { x: 158.47, y: 638.7 }, { x: 163.64, y: 661.94 }, { x: 68.9, y: 661.94 }] },
      { control: { left: 167.08, top: 627.51, width: 101.62, height: 61.12 }, inner: [{ x: 176.56, y: 639.56 }, { x: 260.1, y: 639.56 }, { x: 264.4, y: 662.81 }, { x: 170.53, y: 662.81 }] },
      { control: { left: 268.71, top: 627.51, width: 111.96, height: 61.12 }, inner: [{ x: 279.04, y: 640.43 }, { x: 361.72, y: 640.43 }, { x: 366.03, y: 662.81 }, { x: 272.15, y: 662.81 }] },
      { control: { left: 10.33, top: 688.63, width: 135.22, height: 68 }, inner: [{ x: 47.37, y: 698.1 }, { x: 136.08, y: 698.1 }, { x: 142.11, y: 722.2 }, { x: 40.48, y: 722.2 }] },
      { control: { left: 145.55, top: 688.63, width: 108.52, height: 68 }, inner: [{ x: 155.02, y: 698.96 }, { x: 244.59, y: 698.96 }, { x: 249.76, y: 723.06 }, { x: 149, y: 723.06 }] },
      { control: { left: 254.07, top: 688.63, width: 115.41, height: 68 }, inner: [{ x: 264.4, y: 699.82 }, { x: 353.11, y: 699.82 }, { x: 357.42, y: 723.06 }, { x: 257.51, y: 723.06 }] },
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
  const rack = KITCHEN_RACK_LAYOUTS[layout]

  if (rack.cells) return rack.cells.map(({ control }) => ({
    ...control,
    right: Number((control.left + control.width).toFixed(2)),
    bottom: Number((control.top + control.height).toFixed(2)),
  }))

  return Array.from({ length: rack.columns * rack.rows }, (_, index) => {
    const left = rack.left + (index % rack.columns) * rack.columnGap
    const top = rack.top + Math.floor(index / rack.columns) * rack.rowGap
    return {
      left,
      top,
      width: rack.width,
      height: rack.height,
      right: left + rack.width,
      bottom: top + rack.height,
    }
  })
}

function translatedInnerPolygon(origin: Pick<Rect, 'left' | 'top'>, inner: InnerMaskGeometry): Point[] {
  return inner.clip.map((point) => ({
    x: origin.left + inner.left + point.x * inner.width,
    y: origin.top + inner.top + point.y * inner.height,
  }))
}

export function rackInnerPolygons(layout: RackLayout): Point[][] {
  const rack = KITCHEN_RACK_LAYOUTS[layout]
  if (rack.cells) return rack.cells.map(({ inner }) => inner.map((point) => ({ ...point })))
  return rackRectangles(layout).map((control) => translatedInnerPolygon(control, rack.inner))
}

export function ingredientRackCellStyle(layout: RackLayout, index: number, ingredientId: IngredientId): CSSProperties {
  const control = rackRectangles(layout)[index]
  const polygon = rackInnerPolygons(layout)[index]
  if (!control || !polygon) throw new Error(`Missing ${layout} rack cell ${index}`)
  const left = Math.min(...polygon.map((point) => point.x))
  const top = Math.min(...polygon.map((point) => point.y))
  const right = Math.max(...polygon.map((point) => point.x))
  const bottom = Math.max(...polygon.map((point) => point.y))
  const width = right - left
  const height = bottom - top
  const localClip = polygon.map((point) => ({ x: (point.x - left) / width, y: (point.y - top) / height }))
  const visualCenterX = polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length
  const placement = INGREDIENT_ART_PLACEMENTS[ingredientId]

  return {
    '--ingredient-rack-control-left': `${control.left}px`,
    '--ingredient-rack-control-top': `${control.top}px`,
    '--ingredient-rack-control-width': `${control.width}px`,
    '--ingredient-rack-control-height': `${control.height}px`,
    '--ingredient-rack-inner-left': `${left - control.left}px`,
    '--ingredient-rack-inner-top': `${top - control.top}px`,
    '--ingredient-rack-inner-width': `${width}px`,
    '--ingredient-rack-inner-height': `${height}px`,
    '--ingredient-rack-inner-clip': clipPath(localClip),
    '--ingredient-rack-label-left': `${visualCenterX - control.left}px`,
    '--ingredient-rack-label-top': `${bottom - control.top - 10}px`,
    '--ingredient-art-width': `${placement.width}%`,
    '--ingredient-art-perspective-y': String(placement.perspectiveY),
    '--ingredient-art-center-x': `${placement.centerX}%`,
    '--ingredient-art-center-y': `${placement.centerY}%`,
    '--ingredient-contact-width': `${placement.contactWidth}%`,
    '--ingredient-contact-height': `${placement.contactHeight}%`,
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
    '--ingredient-rack-left': pixel(rack.left),
    '--ingredient-rack-top': pixel(rack.top),
    '--ingredient-rack-column-gap': pixel(rack.columnGap),
    '--ingredient-rack-row-gap': pixel(rack.rowGap),
    '--ingredient-rack-control-width': pixel(rack.width),
    '--ingredient-rack-control-height': pixel(rack.height),
    '--ingredient-rack-inner-left': pixel(rack.inner.left),
    '--ingredient-rack-inner-top': pixel(rack.inner.top),
    '--ingredient-rack-inner-width': pixel(rack.inner.width),
    '--ingredient-rack-inner-height': pixel(rack.inner.height),
    '--ingredient-rack-inner-clip': clipPath(rack.inner.clip),
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
