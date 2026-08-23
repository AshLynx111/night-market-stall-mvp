import { describe, expect, it } from 'vitest'
import type { GriddleSlotState } from '../../landscape/kitchen/types'
import { detectCookingFeedback } from './CookingFeedback'

const slot = (overrides: Partial<GriddleSlotState> = {}): GriddleSlotState => ({
  id: 'left', phase: 'empty', orderId: null, recipeId: null, orderModifiers: [], completedStepIds: [], heatState: 'none',
  heatElapsedMs: 0, heatReadyAtMs: 0, heatBurnAtMs: 0, sauceCoverage: 0, sauceStrokeCount: 0, cutTargetIndices: [],
  rollProgress: 0, qualityPenalty: 0, ...overrides,
})

const snap = (value: GriddleSlotState) => ({
  phase: value.phase, heatState: value.heatState, completedStepIds: value.completedStepIds,
  sauceStrokeCount: value.sauceStrokeCount ?? 0, cutCount: value.cutTargetIndices.length,
})

describe('detectCookingFeedback', () => {
  it('detects placement, egg, heat, sauce, cut, roll, and pack transitions', () => {
    expect(detectCookingFeedback(snap(slot()), snap(slot({ completedStepIds: ['noodle'] })))).toContain('place')
    expect(detectCookingFeedback(snap(slot()), snap(slot({ completedStepIds: ['egg'] })))).toContain('egg')
    expect(detectCookingFeedback(snap(slot({ heatState: 'raw' })), snap(slot({ heatState: 'ready' })))).toContain('ready')
    expect(detectCookingFeedback(snap(slot()), snap(slot({ sauceStrokeCount: 1 })))).toContain('sauce')
    expect(detectCookingFeedback(snap(slot()), snap(slot({ cutTargetIndices: [0] })))).toContain('cut')
    expect(detectCookingFeedback(snap(slot()), snap(slot({ phase: 'rolled' })))).toContain('roll')
    expect(detectCookingFeedback(snap(slot({ phase: 'rolled' })), snap(slot({ phase: 'on-tray' })))).toContain('pack')
  })
})
