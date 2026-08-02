import { CUSTOMER_NAMES, DAYS, modifiersForOrder, recipeForOrder } from '../campaign'
import { advanceCustomerJourney } from './customerTimeline'
import type { CustomerLane, CustomerMood, CustomerState, KitchenState } from './types'

function createReplacementCustomer(state: KitchenState, lane: CustomerLane): CustomerState {
  const sequence = state.nextCustomerSequence
  const dayConfig = DAYS[state.day - 1]
  if (!dayConfig) throw new RangeError(`Unknown campaign day: ${state.day}`)

  const id = `customer-${sequence}`
  const recipe = recipeForOrder(dayConfig, sequence)
  const nameIndex = Math.abs(state.seed + sequence) % CUSTOMER_NAMES.length
  const maxPatienceMs = dayConfig.patienceSeconds * 1_000 + state.patienceBonusMs

  return {
    id,
    artId: `customer-${nameIndex}`,
    name: CUSTOMER_NAMES[nameIndex],
    lane,
    presence: 'entering',
    mood: 'arriving',
    pathProgress: 0,
    motionElapsedMs: 0,
    entryDelayMs: 0,
    patienceMs: maxPatienceMs,
    maxPatienceMs,
    order: {
      id: `order-${sequence}`,
      customerId: id,
      recipeId: recipe.id,
      modifiers: modifiersForOrder(dayConfig, sequence),
    },
  }
}

function createCelebrityCustomer(state: KitchenState, lane: CustomerLane, patienceOverrideMs?: number): CustomerState {
  const dayConfig = DAYS[state.day - 1]
  if (!dayConfig) throw new RangeError(`Unknown campaign day: ${state.day}`)
  const sequence = state.nextCustomerSequence
  const customerId = `celebrity-${sequence}`
  const orderId = `order-celebrity-${sequence}`
  const recipe = recipeForOrder(dayConfig, sequence, true)
  const defaultPatienceMs = dayConfig.patienceSeconds * 1_000 + state.patienceBonusMs + 15_000
  const maxPatienceMs = patienceOverrideMs !== undefined && Number.isFinite(patienceOverrideMs)
    ? Math.max(1, patienceOverrideMs)
    : defaultPatienceMs

  return {
    id: customerId,
    artId: 'celebrity',
    name: '林奕辰先生',
    lane,
    presence: 'entering',
    mood: 'arriving',
    pathProgress: 0,
    motionElapsedMs: 0,
    entryDelayMs: 0,
    patienceMs: maxPatienceMs,
    maxPatienceMs,
    order: {
      id: orderId,
      customerId,
      recipeId: recipe.id,
      modifiers: modifiersForOrder(dayConfig, sequence, true),
    },
  }
}

export function injectCelebrityCustomer(state: KitchenState, patienceOverrideMs?: number): KitchenState {
  if (state.day !== 5 || state.pendingCelebrity || state.celebrityOrderId || state.celebrityServed) return state
  const normalizedPatienceMs = patienceOverrideMs !== undefined && Number.isFinite(patienceOverrideMs)
    ? Math.max(1, patienceOverrideMs)
    : undefined
  return {
    ...state,
    pendingCelebrity: normalizedPatienceMs === undefined ? {} : { patienceOverrideMs: normalizedPatienceMs },
  }
}

export function moodForPatience(customer: CustomerState): CustomerMood {
  const ratio = customer.patienceMs / customer.maxPatienceMs
  return ratio <= 0.18 ? 'urgent' : ratio <= 0.48 ? 'impatient' : 'waiting'
}

export function advanceCustomers(state: KitchenState, deltaMs: number): KitchenState {
  const elapsedMs = Math.max(0, deltaMs)
  if (elapsedMs === 0) return state

  return {
    ...state,
    elapsedMs: state.elapsedMs + elapsedMs,
    customers: state.customers.map((customer) => {
      if (customer.presence !== 'active') return advanceCustomerJourney(customer, elapsedMs)
      if (state.tutorialMode === 'guided-first-order') return customer

      const patienceMs = Math.max(0, customer.patienceMs - elapsedMs)
      return patienceMs === 0
        ? {
            ...customer,
            presence: 'leaving',
            mood: 'disappointed',
            patienceMs,
            motionElapsedMs: 0,
            entryDelayMs: 0,
          }
        : { ...customer, patienceMs, mood: moodForPatience({ ...customer, patienceMs }) }
    }),
  }
}

function markCustomerDeparture(state: KitchenState, customerId: string, mood: 'happy' | 'disappointed'): KitchenState {
  return {
    ...state,
    customers: state.customers.map((customer) =>
      customer.id === customerId && customer.presence === 'active'
        ? { ...customer, presence: 'leaving', mood, motionElapsedMs: 0, entryDelayMs: 0 }
        : customer,
    ),
  }
}

export function markCustomerHappy(state: KitchenState, customerId: string): KitchenState {
  return markCustomerDeparture(state, customerId, 'happy')
}

export function markCustomerDisappointed(state: KitchenState, customerId: string): KitchenState {
  return markCustomerDeparture(state, customerId, 'disappointed')
}

export function replaceDepartedCustomers(state: KitchenState): KitchenState {
  let nextCustomerSequence = state.nextCustomerSequence
  let celebrityOrderId = state.celebrityOrderId
  let pendingCelebrity = state.pendingCelebrity
  const reboundOrderIds = new Map<string, string>()
  const customers = state.customers.map((customer) => {
    if (customer.presence !== 'leaving' || customer.pathProgress !== 0) return customer
    const sequenceState = { ...state, nextCustomerSequence }
    const retryCelebrity = customer.artId === 'celebrity' && !state.celebrityServed
    const admitPendingCelebrity = !retryCelebrity && pendingCelebrity !== null
    const replacement = retryCelebrity || admitPendingCelebrity
      ? createCelebrityCustomer(sequenceState, customer.lane, admitPendingCelebrity
        ? pendingCelebrity?.patienceOverrideMs
        : undefined)
      : createReplacementCustomer(sequenceState, customer.lane)
    if (retryCelebrity) {
      reboundOrderIds.set(customer.order.id, replacement.order.id)
      celebrityOrderId = replacement.order.id
    }
    if (admitPendingCelebrity) {
      pendingCelebrity = null
      celebrityOrderId = replacement.order.id
    }
    nextCustomerSequence += 1
    return replacement
  })

  if (nextCustomerSequence === state.nextCustomerSequence) return state
  const slots = reboundOrderIds.size === 0
    ? state.slots
    : state.slots.map((slot) => slot.orderId && reboundOrderIds.has(slot.orderId)
      ? { ...slot, orderId: reboundOrderIds.get(slot.orderId)! }
      : slot) as KitchenState['slots']
  return { ...state, customers, slots, pendingCelebrity, celebrityOrderId, nextCustomerSequence }
}
