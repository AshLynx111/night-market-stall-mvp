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

const BUBBLE = { width: 118, height: 82 }
const SCREEN = { width: 1440, height: 810 }
const CHARACTER = { halfWidth: 92, height: 350 }

export const HUD_RESERVED_RECTS: ScreenRect[] = [
  { x: 16, y: 16, width: 225, height: 94 },
  { x: 272, y: 22, width: 178, height: 82 },
  { x: 606, y: 18, width: 228, height: 78 },
  { x: 1178, y: 16, width: 246, height: 104 },
]

const CANDIDATE_OFFSETS = {
  left: [{ x: -210, y: -305 }, { x: -175, y: -415 }, { x: 105, y: -415 }],
  center: [{ x: 105, y: -405 }, { x: -225, y: -405 }, { x: -59, y: -455 }],
  right: [{ x: 95, y: -305 }, { x: 55, y: -415 }, { x: -225, y: -415 }],
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
