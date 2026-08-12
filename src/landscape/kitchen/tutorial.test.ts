import { describe, expect, it } from 'vitest'
import { kitchenReducer } from './reducer'
import { createKitchenState } from './state'
import { tutorialAllowsIngredient, tutorialInstruction, tutorialStep } from './tutorial'
import type { KitchenAction } from './reducer'
import type { KitchenState } from './types'

function dispatch(state: KitchenState, action: KitchenAction) {
  return kitchenReducer(state, action)
}

describe('guided first-order tutorial', () => {
  it('guides one protected classic order, then restores three-lane normal timing', () => {
    let state = createKitchenState(1, 17, 0, true)

    expect(state.customers).toHaveLength(1)
    expect(state.customers[0].lane).toBe('left')
    expect(state.tutorialMode).toBe('guided-first-order')
    expect(tutorialStep(state)).toBe('customer-arrival')
    expect(tutorialInstruction(state)).toBe('第一位顾客正在从旁边走来，等她站稳后看看订单。')
    expect(tutorialAllowsIngredient(state, 'noodle', 'left')).toBe(false)

    state = dispatch(state, { type: 'TICK', deltaMs: 1_700 })
    expect(tutorialStep(state)).toBe('noodle')

    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    expect(tutorialStep(state)).toBe('egg')
    state = dispatch(state, { type: 'TAP_EGG', slotId: 'left' })
    expect(tutorialStep(state)).toBe('wait-egg')

    const patience = state.customers[0].patienceMs
    state = dispatch(state, { type: 'TICK', deltaMs: 60_000 })
    expect(state.customers[0].patienceMs).toBe(patience)
    expect(state.slots[0].heatState).toBe('ready')
    expect(state.slots[0].heatElapsedMs).toBe(state.slots[0].heatReadyAtMs)
    expect(tutorialStep(state)).toBe('hot-dog')

    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'hot-dog' })
    expect(tutorialStep(state)).toBe('wait-hot-dog')
    state = dispatch(state, { type: 'TICK', deltaMs: 60_000 })
    expect(state.slots[0].heatState).toBe('ready')
    expect(state.slots[0].heatElapsedMs).toBe(state.slots[0].heatReadyAtMs)
    expect(tutorialStep(state)).toBe('sauce')

    state = dispatch(state, {
      type: 'COMPLETE_GESTURE',
      slotId: 'left',
      gesture: { kind: 'sauce', coverage: 0.9, uniformity: 0.9, complete: true },
    })
    expect(tutorialStep(state)).toBe('sauce')
    expect(state.slots[0].sauceStrokeCount).toBe(1)
    state = dispatch(state, {
      type: 'COMPLETE_GESTURE',
      slotId: 'left',
      gesture: { kind: 'sauce', coverage: 0.9, uniformity: 0.9, complete: true },
    })
    expect(tutorialStep(state)).toBe('scallion')
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'scallion' })
    expect(tutorialStep(state)).toBe('cut')

    for (const targetIndex of [0, 1, 2]) {
      state = dispatch(state, {
        type: 'COMPLETE_GESTURE',
        slotId: 'left',
        gesture: { kind: 'cut', targetIndex, accuracy: 1, progress: 1, verticalDeviation: 0, complete: true },
      })
      expect(tutorialStep(state)).toBe(targetIndex === 2 ? 'roll' : 'cut')
    }

    state = dispatch(state, {
      type: 'COMPLETE_GESTURE',
      slotId: 'left',
      gesture: { kind: 'roll', progress: 1, verticalDeviation: 0, complete: true },
    })
    expect(tutorialStep(state)).toBe('pack')
    state = dispatch(state, { type: 'MOVE_TO_TRAY', slotId: 'left' })
    expect(tutorialStep(state)).toBe('serve')
    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: state.customers[0].id })

    expect(state.tutorialMode).toBe('complete')
    expect(tutorialStep(state)).toBe('done')
    expect(state.customers.map((customer) => customer.lane)).toEqual(['left', 'center', 'right'])
    expect(state.customers.slice(1).map((customer) => customer.presence)).toEqual(['entering', 'entering'])
    expect(new Set(state.customers.map((customer) => customer.id)).size).toBe(3)
    expect(new Set(state.customers.map((customer) => customer.order.id)).size).toBe(3)

    state = dispatch(state, { type: 'TICK', deltaMs: 2_150 })
    const normalPatience = state.customers[1].patienceMs
    state = dispatch(state, { type: 'TICK', deltaMs: 1_000 })
    expect(state.customers[1].patienceMs).toBe(normalPatience - 1_000)
  })

  it('allows only the current left-slot ingredient and preserves state on guided mistakes', () => {
    let state = createKitchenState(1, 4, 0, true)
    state = dispatch(state, { type: 'TICK', deltaMs: 1_700 })
    expect(tutorialAllowsIngredient(state, 'noodle', 'left')).toBe(true)
    expect(tutorialAllowsIngredient(state, 'noodle', 'right')).toBe(false)
    expect(tutorialAllowsIngredient(state, 'egg', 'left')).toBe(false)

    expect(dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })).toBe(state)
    expect(dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'egg' })).toBe(state)
    expect(dispatch(state, { type: 'DISCARD_SLOT', slotId: 'left' })).toBe(state)

    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    expect(dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'hot-dog' })).toBe(state)
    expect(dispatch(state, { type: 'DISCARD_SLOT', slotId: 'left' })).toBe(state)

    state = dispatch(state, { type: 'TAP_EGG', slotId: 'left' })
    expect(dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'hot-dog' })).toBe(state)
    expect(dispatch(state, {
      type: 'COMPLETE_GESTURE',
      slotId: 'left',
      gesture: { kind: 'sauce', coverage: 1, uniformity: 1, complete: true },
    })).toBe(state)
    expect(state.mistakes).toBe(0)
  })

  it('does not enable guided mode outside Day 1', () => {
    const state = createKitchenState(2, 5, 0, true)
    expect(state.tutorialMode).toBe('off')
    expect(state.customers).toHaveLength(3)
    expect(tutorialStep(state)).toBe('done')
  })
})
