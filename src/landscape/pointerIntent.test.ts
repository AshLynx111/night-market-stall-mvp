import { describe, expect, it } from 'vitest'
import { isIntentionalPointerDrag, pointerDragThreshold } from './pointerIntent'

describe('pointer intent', () => {
  it.each([
    ['mouse', 4],
    ['pen', 4],
    ['touch', 10],
  ])('uses a %s movement threshold of %d pixels', (pointerType, threshold) => {
    expect(pointerDragThreshold(pointerType)).toBe(threshold)
  })

  it('treats normal touch wobble as a tap and larger movement as a drag', () => {
    expect(isIntentionalPointerDrag('touch', 6, 6)).toBe(false)
    expect(isIntentionalPointerDrag('touch', 11, 0)).toBe(true)
  })

  it('keeps precise mouse and pen dragging', () => {
    expect(isIntentionalPointerDrag('mouse', 5, 0)).toBe(true)
    expect(isIntentionalPointerDrag('pen', 3, 3)).toBe(true)
  })
})
