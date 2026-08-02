import type { IngredientId } from '../campaign'
import type { GestureResult } from './gestures'
import { advanceGriddles, discardSlot, placeIngredient } from './griddle'
import { advanceCustomers, injectCelebrityCustomer, moodForPatience, replaceDepartedCustomers } from './queue'
import { applyGesture, deliverDish, moveSlotToTray } from './service'
import { populateTutorialCustomerLanes } from './state'
import type { CustomerState, KitchenState, SlotId } from './types'

export type KitchenAction =
  | { type: 'TICK'; deltaMs: number }
  | { type: 'SET_PAUSED'; paused: boolean }
  | { type: 'DROP_INGREDIENT'; slotId: SlotId; ingredient: IngredientId }
  | { type: 'TAP_EGG'; slotId: SlotId }
  | { type: 'COMPLETE_GESTURE'; slotId: SlotId; gesture: GestureResult }
  | { type: 'DISCARD_SLOT'; slotId: SlotId }
  | { type: 'MOVE_TO_TRAY'; slotId: SlotId }
  | { type: 'DELIVER'; slotId: SlotId; customerId: string }
  | { type: 'CLEAR_TRANSIENT_MOOD'; customerId: string; token?: number }
  | { type: 'INJECT_CELEBRITY'; patienceMs?: number }

function withoutTransientMood(customer: CustomerState): CustomerState {
  const { transientMood: _transientMood, ...rest } = customer
  return rest
}

function preserveActiveTransientMoods(state: KitchenState): KitchenState {
  let changed = false
  const customers = state.customers.map((customer) => {
    const transient = customer.transientMood
    if (!transient) return customer

    if (customer.presence !== 'active' || state.elapsedMs >= transient.expiresAtMs) {
      changed = true
      return withoutTransientMood(customer)
    }

    changed = changed || customer.mood !== transient.mood
    return { ...customer, mood: transient.mood }
  })
  return changed ? { ...state, customers } : state
}

function clearTransientMood(state: KitchenState, customerId: string, token?: number): KitchenState {
  let changed = false
  const customers = state.customers.map((customer) => {
    if (customer.id !== customerId || !customer.transientMood) return customer
    if (state.elapsedMs < customer.transientMood.expiresAtMs) return customer
    if (token !== undefined && customer.transientMood.token !== token) return customer
    changed = true
    const restored = withoutTransientMood(customer)
    return customer.presence === 'active'
      ? { ...restored, mood: moodForPatience(customer) }
      : restored
  })
  return changed ? { ...state, customers } : state
}

function deliver(state: KitchenState, slotId: SlotId, customerId: string): KitchenState {
  const receivingCustomer = state.customers.find((customer) => customer.id === customerId)
  const result = deliverDish(state, slotId, customerId)
  if (state.tutorialMode === 'guided-first-order') {
    if (!result.accepted) return state
    return populateTutorialCustomerLanes({ ...result.state, tutorialMode: 'complete' })
  }
  if (!result.feedback || !receivingCustomer) return result.state

  return {
    ...result.state,
    nextTransientMoodToken: state.nextTransientMoodToken + 1,
    customers: result.state.customers.map((customer) => customer.id === result.feedback?.customerId
      ? {
          ...customer,
          mood: result.feedback.mood,
          transientMood: {
            mood: result.feedback.mood,
            token: state.nextTransientMoodToken,
            expiresAtMs: result.state.elapsedMs + result.feedback.durationMs,
          },
        }
      : customer),
  }
}

export function kitchenReducer(state: KitchenState, action: KitchenAction): KitchenState {
  if (state.paused && action.type !== 'SET_PAUSED') return state

  switch (action.type) {
    case 'TICK': {
      if (state.paused) return state
      const customersAdvanced = advanceCustomers(state, action.deltaMs)
      const transientPreserved = preserveActiveTransientMoods(customersAdvanced)
      const griddlesAdvanced = advanceGriddles(transientPreserved, action.deltaMs)
      return replaceDepartedCustomers(griddlesAdvanced)
    }
    case 'SET_PAUSED':
      return state.paused === action.paused ? state : { ...state, paused: action.paused }
    case 'DROP_INGREDIENT':
      return placeIngredient(state, action.slotId, action.ingredient).state
    case 'TAP_EGG':
      return placeIngredient(state, action.slotId, 'egg').state
    case 'COMPLETE_GESTURE':
      return applyGesture(state, action.slotId, action.gesture).state
    case 'DISCARD_SLOT':
      return state.tutorialMode === 'guided-first-order' ? state : discardSlot(state, action.slotId)
    case 'MOVE_TO_TRAY':
      return moveSlotToTray(state, action.slotId).state
    case 'DELIVER':
      return deliver(state, action.slotId, action.customerId)
    case 'CLEAR_TRANSIENT_MOOD':
      return clearTransientMood(state, action.customerId, action.token)
    case 'INJECT_CELEBRITY':
      return injectCelebrityCustomer(state, action.patienceMs)
  }
}
