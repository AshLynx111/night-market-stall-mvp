import { CUSTOMER_NAMES, DAYS, modifiersForOrder, recipeForOrder } from '../campaign'
import { CUSTOMER_MOTION_TIMING } from './customerTimeline'
import type { CustomerLane, CustomerState, GriddleSlotState, KitchenState, SlotId } from './types'

const LANES: CustomerLane[] = ['left', 'center', 'right']

export function createEmptySlot(id: SlotId): GriddleSlotState {
  return {
    id,
    phase: 'empty',
    orderId: null,
    recipeId: null,
    orderModifiers: [],
    completedStepIds: [],
    heatState: 'none',
    heatElapsedMs: 0,
    heatReadyAtMs: 0,
    heatBurnAtMs: 0,
    sauceCoverage: 0,
    cutTargetIndices: [],
    rollProgress: 0,
    qualityPenalty: 0,
  }
}

function createInitialCustomer(
  day: number,
  seed: number,
  index: number,
  patienceBonusMs: number,
  entryDelayMs: number,
): CustomerState {
  const dayConfig = DAYS[day - 1]
  if (!dayConfig) throw new RangeError(`Unknown campaign day: ${day}`)

  const id = `customer-${index}`
  const recipe = recipeForOrder(dayConfig, index)
  const nameIndex = Math.abs(seed + index) % CUSTOMER_NAMES.length
  const maxPatienceMs = dayConfig.patienceSeconds * 1_000 + patienceBonusMs

  return {
    id,
    artId: `customer-${nameIndex}`,
    name: CUSTOMER_NAMES[nameIndex],
    lane: LANES[index],
    presence: 'entering',
    mood: 'arriving',
    pathProgress: 0,
    motionElapsedMs: 0,
    entryDelayMs,
    patienceMs: maxPatienceMs,
    maxPatienceMs,
    order: {
      id: `order-${index}`,
      customerId: id,
      recipeId: recipe.id,
      modifiers: modifiersForOrder(dayConfig, index),
    },
  }
}

export function createKitchenState(day: number, seed: number, patienceBonusMs = 0, guidedTutorial = false): KitchenState {
  const safePatienceBonusMs = Math.max(0, patienceBonusMs)
  const tutorialMode = day === 1 && guidedTutorial ? 'guided-first-order' : 'off'
  return {
    day,
    seed,
    patienceBonusMs: safePatienceBonusMs,
    elapsedMs: 0,
    paused: false,
    tutorialMode,
    customers: tutorialMode === 'guided-first-order'
      ? [createInitialCustomer(day, seed, 0, safePatienceBonusMs, 0)]
      : LANES.map((_, index) => createInitialCustomer(
        day,
        seed,
        index,
        safePatienceBonusMs,
        index * CUSTOMER_MOTION_TIMING.initialStaggerMs,
      )),
    slots: [createEmptySlot('left'), createEmptySlot('right')],
    servedQualities: [],
    deliveries: [],
    mistakes: 0,
    nextCustomerSequence: 3,
    nextTransientMoodToken: 1,
    pendingCelebrity: null,
    celebrityOrderId: null,
    celebrityServed: false,
  }
}

export function populateTutorialCustomerLanes(state: KitchenState): KitchenState {
  const existingCustomerIds = new Set(state.customers.map((customer) => customer.id))
  const existingOrderIds = new Set(state.customers.map((customer) => customer.order.id))
  const existingLanes = new Set(state.customers.map((customer) => customer.lane))
  const additions = [1, 2]
    .map((index) => createInitialCustomer(
      state.day,
      state.seed,
      index,
      state.patienceBonusMs,
      index * CUSTOMER_MOTION_TIMING.initialStaggerMs,
    ))
    .filter((customer) => !existingLanes.has(customer.lane)
      && !existingCustomerIds.has(customer.id)
      && !existingOrderIds.has(customer.order.id))

  return additions.length === 0 ? state : { ...state, customers: [...state.customers, ...additions] }
}

export function activeCustomers(state: KitchenState) {
  return state.customers.filter((customer) => customer.presence !== 'leaving')
}

export function occupiedSlots(state: KitchenState) {
  return state.slots.filter((slot) => slot.phase !== 'empty')
}
