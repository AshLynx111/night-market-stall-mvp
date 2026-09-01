import { describe, expect, it } from 'vitest'
import { observeKitchenTransition } from './gameplayObserver'
import { createKitchenState } from '../landscape/kitchen/state'
import type { KitchenState } from '../landscape/kitchen/types'

function activeGuidedState() {
  const state = createKitchenState(1, 100, 0, true)
  return {
    ...state,
    customers: state.customers.map((customer) => ({
      ...customer,
      presence: 'active' as const,
      mood: 'ordering' as const,
      pathProgress: 1,
    })),
  }
}

describe('kitchen analytics observer', () => {
  it('observes accepted ingredient and tutorial-step transitions without mutation', () => {
    const previous = activeGuidedState()
    const next: KitchenState = {
      ...previous,
      slots: [{
        ...previous.slots[0],
        phase: 'assembling',
        orderId: previous.customers[0].order.id,
        recipeId: 'classic',
        completedStepIds: ['noodle'],
      }, previous.slots[1]],
    }
    const snapshot = JSON.stringify(previous)
    expect(observeKitchenTransition(previous, next)).toEqual(expect.arrayContaining([
      { kind: 'tutorial_step_changed', previousStep: 'noodle', currentStep: 'egg' },
      { kind: 'ingredient_placed', ingredientId: 'noodle', recipeId: 'classic', stepId: 'noodle', slotId: 'left' },
    ]))
    expect(JSON.stringify(previous)).toBe(snapshot)
  })

  it('observes completed gestures and packing once', () => {
    const base = activeGuidedState()
    const previous: KitchenState = {
      ...base,
      tutorialMode: 'off',
      slots: [{ ...base.slots[0], recipeId: 'classic', completedStepIds: ['noodle', 'egg', 'hot-dog'] }, base.slots[1]],
    }
    const next: KitchenState = {
      ...previous,
      slots: [{ ...previous.slots[0], phase: 'on-tray', completedStepIds: [...previous.slots[0].completedStepIds, 'sauce', 'cut', 'roll', 'pack'] }, previous.slots[1]],
    }
    expect(observeKitchenTransition(previous, next)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'gesture_completed', gestureId: 'sauce', slotId: 'left' }),
      expect.objectContaining({ kind: 'gesture_completed', gestureId: 'cut', slotId: 'left' }),
      expect.objectContaining({ kind: 'gesture_completed', gestureId: 'roll', slotId: 'left' }),
      { kind: 'dish_packed', recipeId: 'classic', slotId: 'left' },
    ]))
  })

  it('observes a delivery with stable slot and customer ids', () => {
    const base = activeGuidedState()
    const orderId = base.customers[0].order.id
    const previous: KitchenState = {
      ...base,
      slots: [{ ...base.slots[0], phase: 'on-tray', orderId, recipeId: 'classic' }, base.slots[1]],
    }
    const next: KitchenState = {
      ...previous,
      tutorialMode: 'complete',
      slots: [{ ...previous.slots[0], phase: 'empty', orderId: null, recipeId: null }, previous.slots[1]],
      deliveries: [{ orderId, recipeId: 'classic', quality: 96 }],
      servedQualities: [96],
    }
    expect(observeKitchenTransition(previous, next)).toContainEqual({
      kind: 'delivery_completed', recipeId: 'classic', slotId: 'left', customerId: 'customer-0', quality: 96,
    })
  })

  it('observes timeouts and mistakes while identical states emit nothing', () => {
    const previous = activeGuidedState()
    const next: KitchenState = {
      ...previous,
      mistakes: 1,
      customers: previous.customers.map((customer) => ({ ...customer, presence: 'leaving' as const, mood: 'disappointed' as const })),
    }
    expect(observeKitchenTransition(previous, next)).toEqual(expect.arrayContaining([
      { kind: 'order_timeout', recipeId: 'classic', customerId: 'customer-0' },
      { kind: 'mistake_recorded', mistakeType: 'unknown' },
    ]))
    expect(observeKitchenTransition(previous, previous)).toEqual([])
  })
})
