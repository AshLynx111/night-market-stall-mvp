import { describe, expect, it } from 'vitest'
import { getCustomerPose, getEmotionTransform } from './customerMotion'

describe('customer horizontal entrance motion', () => {
  it('slides horizontally at a fixed scale and vertical anchor', () => {
    for (const lane of ['left', 'center', 'right'] as const) {
      const entering = getCustomerPose(lane, 0)
      const settled = getCustomerPose(lane, 1)

      expect(entering.footX).not.toBe(settled.footX)
      expect(entering.footY).toBe(settled.footY)
      expect(entering.scale).toBe(1)
      expect(settled.scale).toBe(1)
      expect(entering.opacity).toBe(1)
    }
  })

  it('keeps the foot anchor unchanged for every stationary emotion', () => {
    const emotions = ['ordering', 'waiting', 'impatient', 'urgent', 'happy', 'disappointed'] as const

    expect(emotions.map((mood) => getEmotionTransform(mood).footOffsetY)).toEqual([0, 0, 0, 0, 0, 0])
  })
})
