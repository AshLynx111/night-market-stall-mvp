import { getCustomerPose } from './customerMotion'
import type { CustomerLane, CustomerState } from './types'

export interface ScreenRect {
  x: number
  y: number
  width: number
  height: number
}

export interface OrderBubblePose {
  x: number
  y: number
  tailX: number
  rect: ScreenRect
  clearOfCharacter: boolean
}

const BUBBLE = { width: 132, height: 94 }
const SCREEN = { width: 1440, height: 810 }
// The upper part of each square actor canvas is transparent. Use the visible
// body height for bubble collision so the bubble can sit naturally above the
// head instead of being pushed to the side of the screen.
const CHARACTER = { halfWidth: 92, height: 276 }

export const HUD_RESERVED_RECTS: ScreenRect[] = [
  { x: 24, y: 13, width: 272, height: 158 },
  { x: 299, y: 25, width: 193, height: 166 },
  { x: 575, y: 47, width: 330, height: 83 },
  { x: 1142, y: 42, width: 162, height: 167 },
  { x: 1328, y: 26, width: 76, height: 118 },
]

const CANDIDATE_OFFSETS = {
  left: [{ x: 104, y: -370 }, { x: -188, y: -305 }, { x: 70, y: -305 }],
  center: [{ x: -66, y: -392 }, { x: -202, y: -310 }, { x: 70, y: -310 }],
  right: [{ x: -66, y: -382 }, { x: 54, y: -310 }, { x: -186, y: -310 }],
} as const satisfies Record<CustomerLane, readonly { x: number; y: number }[]>

export function rectanglesOverlap(a: ScreenRect, b: ScreenRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y
}

function characterRect(customer: CustomerState): ScreenRect {
  const pose = getCustomerPose(customer.lane, 1)
  return {
    x: pose.footX - CHARACTER.halfWidth,
    y: pose.footY - CHARACTER.height,
    width: CHARACTER.halfWidth * 2,
    height: CHARACTER.height,
  }
}

function isClear(rect: ScreenRect, occupied: readonly ScreenRect[], characters: readonly ScreenRect[]): boolean {
  return !characters.some((character) => rectanglesOverlap(rect, character))
    && !occupied.some((taken) => rectanglesOverlap(rect, taken))
}

function findFallback(occupied: readonly ScreenRect[], characters: readonly ScreenRect[]): ScreenRect {
  for (let y = 120; y <= SCREEN.height - BUBBLE.height; y += BUBBLE.height + 12) {
    for (let x = 16; x <= SCREEN.width - BUBBLE.width - 16; x += BUBBLE.width + 16) {
      const rect = { x, y, ...BUBBLE }
      if (isClear(rect, occupied, characters)) return rect
    }
  }

  throw new RangeError('No collision-free order bubble position is available')
}

export function layoutOrderBubbles(customers: readonly CustomerState[]): Record<string, OrderBubblePose> {
  const activeCustomers = customers.filter((customer) => customer.presence === 'active')
  const characterRects = activeCustomers.map(characterRect)
  const occupied: ScreenRect[] = [...HUD_RESERVED_RECTS]

  return activeCustomers.reduce<Record<string, OrderBubblePose>>((result, customer) => {
    const pose = getCustomerPose(customer.lane, 1)
    const rect = CANDIDATE_OFFSETS[customer.lane]
      .map((offset) => ({ x: pose.footX + offset.x, y: pose.footY + offset.y, ...BUBBLE }))
      .find((candidate) => isClear(candidate, occupied, characterRects))
      ?? findFallback(occupied, characterRects)

    occupied.push(rect)
    result[customer.id] = {
      x: rect.x + rect.width / 2,
      y: rect.y,
      tailX: Math.min(rect.width - 16, Math.max(16, pose.footX - rect.x)),
      rect,
      clearOfCharacter: !characterRects.some((character) => rectanglesOverlap(rect, character)),
    }
    return result
  }, {})
}
