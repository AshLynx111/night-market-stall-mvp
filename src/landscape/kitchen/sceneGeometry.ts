import type { CSSProperties } from 'react'
import type { SlotId } from './types'

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface RackGeometry extends Rect {
  columns: number
  rows: number
  columnGap: number
  rowGap: number
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
  },
}

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
  } as KitchenGeometryVariables as CSSProperties
}
