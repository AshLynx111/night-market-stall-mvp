import { describe, expect, it } from 'vitest'
import { getCustomerPose } from './customerMotion'
import { createKitchenState } from './state'
import { HUD_RESERVED_RECTS, layoutOrderBubbles, rectanglesOverlap, type ScreenRect } from './orderBubbleLayout'

const LOGICAL_SCENE = { width: 1440, height: 810 }

function characterRect(customer: { lane: 'left' | 'center' | 'right' }): ScreenRect {
  const pose = getCustomerPose(customer.lane, 1)
  return { x: pose.footX - 92, y: pose.footY - 276, width: 184, height: 276 }
}

function expectClearAndInBounds(poses: ScreenRect[], active: { lane: 'left' | 'center' | 'right' }[]) {
  const characters = active.map(characterRect)

  expect(poses.every((rect) => rect.x >= 0 && rect.y >= 0
    && rect.x + rect.width <= LOGICAL_SCENE.width
    && rect.y + rect.height <= LOGICAL_SCENE.height)).toBe(true)
  expect(poses.every((rect) => characters.every((character) => !rectanglesOverlap(rect, character)))).toBe(true)
}

describe('order bubble layout', () => {
  it('places three active bubbles without collisions', () => {
    const state = createKitchenState(3, 1)
    const active = state.customers.map((customer) => ({
      ...customer,
      presence: 'active' as const,
      pathProgress: 1,
    }))
    const layout = layoutOrderBubbles(active)
    const poses = Object.values(layout)

    expect(poses).toHaveLength(3)
    expectClearAndInBounds(poses.map((pose) => pose.rect), active)
    expect(poses.every((pose) => HUD_RESERVED_RECTS.every((hud) => !rectanglesOverlap(pose.rect, hud)))).toBe(true)
    expect(rectanglesOverlap(poses[0].rect, poses[1].rect)).toBe(false)
    expect(rectanglesOverlap(poses[1].rect, poses[2].rect)).toBe(false)
    expect(rectanglesOverlap(poses[0].rect, poses[2].rect)).toBe(false)
  })

  it('uses a deterministic collision-free fallback when lane candidates are occupied', () => {
    const customer = {
      ...createKitchenState(3, 1).customers[0],
      presence: 'active' as const,
      pathProgress: 1,
    }
    const active = Array.from({ length: 4 }, (_, index) => ({
      ...customer,
      id: `duplicate-lane-${index}`,
    }))

    const firstLayout = layoutOrderBubbles(active)
    const secondLayout = layoutOrderBubbles(active)
    const poses = Object.values(firstLayout)

    expect(secondLayout).toEqual(firstLayout)
    expect(poses).toHaveLength(4)
    expectClearAndInBounds(poses.map((pose) => pose.rect), active)
    expect(poses.every((pose) => HUD_RESERVED_RECTS.every((hud) => !rectanglesOverlap(pose.rect, hud)))).toBe(true)
    expect(poses.every((pose, index) => poses.every((other, otherIndex) => index === otherIndex
      || !rectanglesOverlap(pose.rect, other.rect)))).toBe(true)
  })
})
