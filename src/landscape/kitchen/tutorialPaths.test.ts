import { describe, expect, it } from 'vitest'
import { measureCut, measureRoll, measureSauce } from './gestures'
import { TUTORIAL_GESTURE_RECT, tutorialGesturePath } from './tutorialPaths'

describe('displayed tutorial gesture paths', () => {
  it('shows two simple horizontal sauce strokes that the recognizer accepts', () => {
    const result = measureSauce(tutorialGesturePath('sauce'), TUTORIAL_GESTURE_RECT)
    expect(result).toMatchObject({ complete: true })
    expect(result.coverage).toBeGreaterThanOrEqual(0.45)
    expect(tutorialGesturePath('sauce')).toHaveLength(4)
  })

  it('feeds each displayed next-cut path through the real recognizer at >=55% width', () => {
    const completed: number[] = []
    for (const targetIndex of [0, 1, 2]) {
      const result = measureCut(tutorialGesturePath('cut', targetIndex), TUTORIAL_GESTURE_RECT, completed)
      expect(result).toMatchObject({ complete: true, targetIndex })
      expect(result.progress).toBeGreaterThanOrEqual(0.55)
      completed.push(targetIndex)
    }
  })

  it('feeds the displayed roll path through the real recognizer at >=75% width and low deviation', () => {
    const result = measureRoll(tutorialGesturePath('roll'), TUTORIAL_GESTURE_RECT)
    expect(result).toMatchObject({ complete: true })
    expect(result.progress).toBeGreaterThanOrEqual(0.75)
    expect(result.verticalDeviation).toBeLessThan(0.1)
  })
})
