import type { CSSProperties } from 'react'
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

// These values preserve the approved background-aligned rack controls exactly.
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
  },
  'expanded-3x5': {
    columns: 3,
    rows: 5,
    left: 18,
    top: 466,
    columnGap: 102,
    rowGap: 65,
    width: 98,
    height: 61,
    inner: {
      left: 7,
      top: 6,
      width: 84,
      height: 45,
      clip: [
        { x: .09, y: .02 },
        { x: .91, y: .02 },
        { x: .99, y: .94 },
        { x: .01, y: .94 },
      ],
    },
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
  return rackRectangles(layout).map((control) => translatedInnerPolygon(control, rack.inner))
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

  return {
    ...Object.fromEntries(griddleVariables),
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
