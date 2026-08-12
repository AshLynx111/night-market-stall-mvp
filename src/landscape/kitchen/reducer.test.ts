import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DAYS, effectiveRecipeSteps, ingredientForCookingStep } from '../campaign'
import { slotExpectedAction } from './griddle'
import { isKitchenDayComplete } from './progress'
import { createKitchenState } from './state'
import { advanceCustomers } from './queue'
import type { KitchenState, SlotId } from './types'
import { kitchenReducer } from './reducer'
import { useKitchenGame } from './useKitchenGame'

function dispatch(state: KitchenState, action: Parameters<typeof kitchenReducer>[1]) {
  return kitchenReducer(state, action)
}

function activeKitchenState(day: number, seed: number, patienceBonusMs = 0): KitchenState {
  return advanceCustomers(createKitchenState(day, seed, patienceBonusMs), 2_600)
}

function finishClassicDish(state: KitchenState, slotId: SlotId) {
  state = dispatch(state, {
    type: 'COMPLETE_GESTURE',
    slotId,
    gesture: { kind: 'sauce', coverage: 0.9, uniformity: 0.9, complete: true },
  })
  state = dispatch(state, {
    type: 'COMPLETE_GESTURE',
    slotId,
    gesture: { kind: 'sauce', coverage: 0.9, uniformity: 0.9, complete: true },
  })
  state = dispatch(state, { type: 'DROP_INGREDIENT', slotId, ingredient: 'scallion' })
  for (const targetIndex of [0, 1, 2]) {
    state = dispatch(state, {
      type: 'COMPLETE_GESTURE',
      slotId,
      gesture: {
        kind: 'cut', targetIndex, accuracy: 1, progress: 1, verticalDeviation: 0, complete: true,
      },
    })
  }
  state = dispatch(state, {
    type: 'COMPLETE_GESTURE',
    slotId,
    gesture: { kind: 'roll', progress: 1, verticalDeviation: 0, complete: true },
  })
  return dispatch(state, { type: 'MOVE_TO_TRAY', slotId })
}

function finishSignatureDish(state: KitchenState, slotId: SlotId) {
  state = dispatch(state, { type: 'DROP_INGREDIENT', slotId, ingredient: 'noodle' })
  state = dispatch(state, { type: 'TAP_EGG', slotId })
  state = dispatch(state, { type: 'TICK', deltaMs: 4_000 })
  expect(state.slots.find((slot) => slot.id === slotId)?.heatState).toBe('ready')
  expect(state.slots.find((slot) => slot.id === slotId)?.heatState).not.toBe('burnt')
  state = dispatch(state, { type: 'DROP_INGREDIENT', slotId, ingredient: 'turkey-noodle' })
  state = dispatch(state, { type: 'TICK', deltaMs: 5_000 })
  expect(state.slots.find((slot) => slot.id === slotId)?.heatState).toBe('ready')
  expect(state.slots.find((slot) => slot.id === slotId)?.heatState).not.toBe('burnt')
  state = dispatch(state, { type: 'DROP_INGREDIENT', slotId, ingredient: 'cheese' })
  state = dispatch(state, { type: 'DROP_INGREDIENT', slotId, ingredient: 'corn' })
  while (slotExpectedAction(state, slotId)?.id !== 'sauce') {
    const expected = slotExpectedAction(state, slotId)
    const ingredient = expected && ingredientForCookingStep(expected)
    if (!ingredient) throw new Error(`Expected modifier ingredient before sauce, got ${expected?.id}`)
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId, ingredient })
  }
  state = dispatch(state, {
    type: 'COMPLETE_GESTURE',
    slotId,
    gesture: { kind: 'sauce', coverage: 0.9, uniformity: 0.9, complete: true },
  })
  state = dispatch(state, {
    type: 'COMPLETE_GESTURE',
    slotId,
    gesture: { kind: 'sauce', coverage: 0.9, uniformity: 0.9, complete: true },
  })
  state = dispatch(state, { type: 'DROP_INGREDIENT', slotId, ingredient: 'scallion' })
  for (const targetIndex of [0, 1, 2]) {
    state = dispatch(state, {
      type: 'COMPLETE_GESTURE',
      slotId,
      gesture: {
        kind: 'cut', targetIndex, accuracy: 1, progress: 1, verticalDeviation: 0, complete: true,
      },
    })
  }
  state = dispatch(state, {
    type: 'COMPLETE_GESTURE',
    slotId,
    gesture: { kind: 'roll', progress: 1, verticalDeviation: 0, complete: true },
  })
  return dispatch(state, { type: 'MOVE_TO_TRAY', slotId })
}

function kitchenWithTrayDish(): KitchenState {
  const state = activeKitchenState(1, 11)
  const slots = [...state.slots] as KitchenState['slots']
  slots[0] = {
    ...slots[0],
    phase: 'on-tray',
    orderId: state.customers[0].order.id,
    recipeId: 'classic',
    completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
    sauceCoverage: 0.9,
    cutTargetIndices: [0, 1, 2],
    rollProgress: 1,
  }
  return { ...state, slots }
}

describe('kitchen reducer integration', () => {
  it('cannot finish Day 5 until the injected live celebrity order is delivered', () => {
    let state = activeKitchenState(5, 500)
    state = dispatch(state, { type: 'INJECT_CELEBRITY' })
    state = {
      ...state,
      customers: state.customers.map((customer, index) => index === 2
        ? { ...customer, presence: 'leaving' as const, mood: 'happy' as const, motionElapsedMs: 0 }
        : customer),
    }
    state = dispatch(state, { type: 'TICK', deltaMs: 1_300 })
    state = dispatch(state, { type: 'TICK', deltaMs: 1_700 })
    const celebrity = state.customers.find((customer) => customer.artId === 'celebrity')!
    expect(celebrity).toMatchObject({ name: '林奕辰先生', order: { recipeId: 'signature' } })
    expect(state.customers.filter((customer) => customer.artId === 'celebrity')).toHaveLength(1)

    state = { ...state, servedQualities: Array(DAYS[4].targetOrders).fill(100) }
    expect(isKitchenDayComplete(DAYS[4], state)).toBe(false)

    const slots = [...state.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0],
      phase: 'on-tray',
      orderId: celebrity.order.id,
      recipeId: celebrity.order.recipeId,
      orderModifiers: celebrity.order.modifiers,
      completedStepIds: [],
      sauceCoverage: 1,
      cutTargetIndices: [0, 1, 2],
      rollProgress: 1,
    }
    state = dispatch({ ...state, slots }, { type: 'DELIVER', slotId: 'left', customerId: celebrity.id })

    expect(state.celebrityServed).toBe(true)
    expect(isKitchenDayComplete(DAYS[4], state)).toBe(true)
    expect(dispatch(state, { type: 'INJECT_CELEBRITY' })).toBe(state)
  })

  it('times out, requeues, serves the fresh celebrity order, and then completes Day 5', () => {
    let state = dispatch(activeKitchenState(5, 501), { type: 'INJECT_CELEBRITY' })
    state = {
      ...state,
      customers: state.customers.map((customer, index) => index === 2
        ? { ...customer, presence: 'leaving' as const, mood: 'happy' as const, motionElapsedMs: 0 }
        : customer),
    }
    state = dispatch(state, { type: 'TICK', deltaMs: 1_300 })
    state = dispatch(state, { type: 'TICK', deltaMs: 1_700 })
    const expired = state.customers.find((customer) => customer.artId === 'celebrity')!
    const occupiedSlots = [...state.slots] as KitchenState['slots']
    occupiedSlots[0] = {
      ...occupiedSlots[0],
      phase: 'assembling',
      orderId: expired.order.id,
      recipeId: expired.order.recipeId,
      orderModifiers: expired.order.modifiers,
      completedStepIds: ['noodle'],
    }
    state = { ...state, slots: occupiedSlots }
    expect(state.slots[0].orderId).toBe(expired.order.id)

    state = {
      ...state,
      customers: state.customers.map((customer) => customer.id === expired.id
        ? { ...customer, patienceMs: 1, maxPatienceMs: 1 }
        : customer),
    }
    state = dispatch(state, { type: 'TICK', deltaMs: 1 })
    state = dispatch(state, { type: 'TICK', deltaMs: 1_300 })
    const retry = state.customers.find((customer) => customer.artId === 'celebrity')!

    expect(retry.order.id).not.toBe(expired.order.id)
    expect(state.slots[0].orderId).toBe(retry.order.id)
    state = dispatch(state, { type: 'TICK', deltaMs: 1_700 })
    state = { ...state, servedQualities: Array(DAYS[4].targetOrders - 1).fill(100) }
    const slots = [...state.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0],
      phase: 'on-tray',
      orderId: retry.order.id,
      recipeId: retry.order.recipeId,
      orderModifiers: retry.order.modifiers,
      sauceCoverage: 1,
      cutTargetIndices: [0, 1, 2],
      rollProgress: 1,
    }
    state = dispatch({ ...state, slots }, { type: 'DELIVER', slotId: 'left', customerId: retry.id })

    expect(state.celebrityServed).toBe(true)
    expect(state.servedQualities).toHaveLength(DAYS[4].targetOrders)
    expect(isKitchenDayComplete(DAYS[4], state)).toBe(true)
  })

  it('keeps a retried entering celebrity and all penalties unchanged on an active wrong receiver', () => {
    let state = dispatch(activeKitchenState(5, 503), { type: 'INJECT_CELEBRITY' })
    state = {
      ...state,
      customers: state.customers.map((customer, index) => index === 2
        ? { ...customer, presence: 'leaving' as const, mood: 'happy' as const, motionElapsedMs: 0 }
        : customer),
    }
    state = dispatch(state, { type: 'TICK', deltaMs: 1_300 })
    state = dispatch(state, { type: 'TICK', deltaMs: 1_700 })
    const expired = state.customers.find((customer) => customer.artId === 'celebrity')!
    const slots = [...state.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0],
      phase: 'on-tray',
      orderId: expired.order.id,
      recipeId: expired.order.recipeId,
      orderModifiers: expired.order.modifiers,
    }
    state = {
      ...state,
      slots,
      customers: state.customers.map((customer) => customer.id === expired.id
        ? { ...customer, patienceMs: 1, maxPatienceMs: 1 }
        : customer),
    }
    state = dispatch(state, { type: 'TICK', deltaMs: 1 })
    state = dispatch(state, { type: 'TICK', deltaMs: 1_300 })
    const retry = state.customers.find((customer) => customer.artId === 'celebrity')!
    const activeReceiver = state.customers.find((customer) => customer.presence === 'active')!

    expect(retry).toMatchObject({ presence: 'entering', mood: 'arriving' })
    expect(state.slots[0].orderId).toBe(retry.order.id)
    const rejected = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: activeReceiver.id })

    expect(rejected).toBe(state)
    expect(rejected.mistakes).toBe(state.mistakes)
    expect(rejected.customers.map((customer) => customer.patienceMs))
      .toEqual(state.customers.map((customer) => customer.patienceMs))
  })

  it('keeps the served customer through the full turn and walk-out before admitting a pending celebrity', () => {
    let state = activeKitchenState(5, 502)
    const servedCustomer = state.customers[0]
    const slots = [...state.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'on-tray', orderId: servedCustomer.order.id, recipeId: servedCustomer.order.recipeId,
      sauceCoverage: 1, cutTargetIndices: [0, 1, 2], rollProgress: 1,
    }
    slots[1] = {
      ...slots[1], phase: 'assembling', orderId: state.customers[1].order.id, recipeId: state.customers[1].order.recipeId,
      completedStepIds: ['noodle'],
    }
    state = dispatch({ ...state, slots }, { type: 'DELIVER', slotId: 'left', customerId: servedCustomer.id })
    state = dispatch(state, { type: 'INJECT_CELEBRITY', patienceMs: 9_000 })
    expect(state.customers[0]).toMatchObject({ id: servedCustomer.id, presence: 'leaving', mood: 'happy' })
    expect(state.pendingCelebrity).toEqual({ patienceOverrideMs: 9_000 })
    expect(state.slots[1]).toMatchObject({ orderId: state.customers[1].order.id, completedStepIds: ['noodle'] })

    state = dispatch(state, { type: 'TICK', deltaMs: 199 })
    expect(state.customers[0]).toMatchObject({ id: servedCustomer.id, presence: 'leaving', pathProgress: 1 })
    state = dispatch(state, { type: 'TICK', deltaMs: 1 })
    expect(state.customers[0]).toMatchObject({ id: servedCustomer.id, presence: 'leaving', pathProgress: 1 })
    state = dispatch(state, { type: 'TICK', deltaMs: 1_099 })
    expect(state.customers[0]).toMatchObject({ id: servedCustomer.id, presence: 'leaving' })

    state = dispatch(state, { type: 'TICK', deltaMs: 1 })
    expect(state.customers[0]).toMatchObject({ artId: 'celebrity', presence: 'entering', maxPatienceMs: 9_000 })
    expect(state.customers.some((customer) => customer.id === servedCustomer.id)).toBe(false)
    expect(state.pendingCelebrity).toBeNull()
    expect(state.celebrityOrderId).toBe(state.customers[0].order.id)
    expect(state.slots[1]).toMatchObject({ orderId: state.customers[1].order.id, completedStepIds: ['noodle'] })
  })

  it.each(['entering', 'leaving'] as const)('rejects reducer delivery to a %s customer without changing state', (presence) => {
    const prepared = kitchenWithTrayDish()
    const nonActive = {
      ...prepared,
      customers: prepared.customers.map((customer, index) => index === 0
        ? { ...customer, presence }
        : customer),
    }

    expect(dispatch(nonActive, { type: 'DELIVER', slotId: 'left', customerId: 'customer-0' })).toBe(nonActive)
  })

  it('completes the Day 3 signature turkey-noodle order end to end above target quality', () => {
    const dayThree = activeKitchenState(3, 21, 6_000)
    expect(dayThree.patienceBonusMs).toBe(6_000)
    expect(dayThree.customers.map((customer) => customer.maxPatienceMs)).toEqual([78_000, 78_000, 78_000])
    const signatureCustomer = dayThree.customers.find((customer) => customer.order.recipeId === 'signature')!
    let state = {
      ...dayThree,
      customers: [signatureCustomer, ...dayThree.customers.filter((customer) => customer.id !== signatureCustomer.id)],
    }

    const outOfOrder = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'cheese' })
    expect(outOfOrder).toBe(state)

    state = finishSignatureDish(state, 'left')
    expect(state.slots[0]).toMatchObject({
      phase: 'on-tray',
      recipeId: 'signature',
      completedStepIds: effectiveRecipeSteps('signature', signatureCustomer.order.modifiers).map((step) => step.id),
      cutTargetIndices: [0, 1, 2],
      rollProgress: 1,
    })

    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: signatureCustomer.id })
    expect(state.deliveries).toEqual([expect.objectContaining({
      orderId: signatureCustomer.order.id,
      recipeId: 'signature',
      quality: expect.any(Number),
    })])
    expect(state.servedQualities).toHaveLength(1)
    expect(state.servedQualities[0]).toBeGreaterThanOrEqual(75)
    expect(state.slots[0].phase).toBe('empty')
  })

  it('isolates ready food while the other slot burns, then recovers from a wrong delivery', () => {
    let state = activeKitchenState(1, 14)
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })
    state = dispatch(state, { type: 'TAP_EGG', slotId: 'right' })
    expect(state.slots[1].heatState).toBe('raw')

    state = dispatch(state, { type: 'TICK', deltaMs: 3_000 })
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = dispatch(state, { type: 'TAP_EGG', slotId: 'left' })
    const intendedCustomer = state.customers.find((customer) => customer.order.id === state.slots[0].orderId)!
    const wrongCustomer = state.customers.find((customer) => customer.id !== intendedCustomer.id)!

    state = dispatch(state, { type: 'TICK', deltaMs: 1_000 })
    expect(state.slots[1].heatState).toBe('ready')
    state = dispatch(state, { type: 'TICK', deltaMs: 8_000 })
    expect(state.slots.map((slot) => slot.heatState)).toEqual(['ready', 'scorched'])
    state = dispatch(state, { type: 'TICK', deltaMs: 2_000 })
    expect(state.slots.map((slot) => slot.heatState)).toEqual(['ready', 'burnt'])

    const preservedLeftSlot = structuredClone(state.slots[0])
    state = dispatch(state, { type: 'DISCARD_SLOT', slotId: 'right' })
    expect(state.slots[0]).toEqual(preservedLeftSlot)
    expect(state.slots[1].phase).toBe('empty')
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })
    expect(state.slots[1]).toMatchObject({ phase: 'assembling', recipeId: 'classic' })

    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'hot-dog' })
    state = dispatch(state, { type: 'TICK', deltaMs: 3_000 })
    state = finishClassicDish(state, 'left')
    const traySlot = structuredClone(state.slots[0])

    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: wrongCustomer.id })
    expect(state.slots[0]).toEqual(traySlot)
    expect(state.deliveries).toHaveLength(0)
    expect(state.servedQualities).toHaveLength(0)

    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: intendedCustomer.id })
    expect(state.deliveries).toHaveLength(1)
    expect(state.servedQualities).toHaveLength(1)
    expect(state.slots[0].phase).toBe('empty')

    const duplicate = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: intendedCustomer.id })
    expect(duplicate.deliveries).toHaveLength(1)
    expect(duplicate.servedQualities).toHaveLength(1)
  })

  it('runs two complete orders in parallel and refills only their vacated lanes', () => {
    let state = activeKitchenState(1, 7)
    const untouchedCustomer = state.customers[2]
    const servedCustomers = state.customers.slice(0, 2)

    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })
    expect(state.slots.map((slot) => slot.orderId)).toEqual(servedCustomers.map((customer) => customer.order.id))

    state = dispatch(state, { type: 'TAP_EGG', slotId: 'left' })
    state = dispatch(state, { type: 'TAP_EGG', slotId: 'right' })
    state = dispatch(state, { type: 'TICK', deltaMs: 4_000 })
    expect(state.slots.map((slot) => slot.heatElapsedMs)).toEqual([4_000, 4_000])
    expect(state.slots.map((slot) => slot.heatState)).toEqual(['ready', 'ready'])

    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'hot-dog' })
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'hot-dog' })
    state = dispatch(state, { type: 'TICK', deltaMs: 3_000 })
    expect(state.slots.map((slot) => slot.heatElapsedMs)).toEqual([3_000, 3_000])

    state = finishClassicDish(state, 'left')
    state = finishClassicDish(state, 'right')
    expect(state.slots.map((slot) => slot.phase)).toEqual(['on-tray', 'on-tray'])

    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: servedCustomers[0].id })
    state = dispatch(state, { type: 'DELIVER', slotId: 'right', customerId: servedCustomers[1].id })
    expect(state.servedQualities).toHaveLength(2)
    expect(state.slots.map((slot) => slot.phase)).toEqual(['empty', 'empty'])
    expect(state.customers.slice(0, 2).map((customer) => customer.presence)).toEqual(['leaving', 'leaving'])

    state = dispatch(state, { type: 'TICK', deltaMs: 1_300 })
    expect(state.customers.map((customer) => customer.id)).toEqual(['customer-3', 'customer-4', untouchedCustomer.id])
    expect(state.customers.map((customer) => customer.lane)).toEqual(['left', 'center', 'right'])
    expect(state.customers[2]).toMatchObject({ id: untouchedCustomer.id, presence: 'active' })
  })

  it('freezes both patience and heat while paused', () => {
    let state = activeKitchenState(1, 2)
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = dispatch(state, { type: 'TAP_EGG', slotId: 'left' })
    state = dispatch(state, { type: 'SET_PAUSED', paused: true })
    const patience = state.customers.map((customer) => customer.patienceMs)
    const heat = state.slots.map((slot) => slot.heatElapsedMs)

    state = dispatch(state, { type: 'TICK', deltaMs: 10_000 })

    expect(state.customers.map((customer) => customer.patienceMs)).toEqual(patience)
    expect(state.slots.map((slot) => slot.heatElapsedMs)).toEqual(heat)
    expect(state.elapsedMs).toBe(2_600)
  })

  it('rejects every gameplay mutation while paused and still accepts resume', () => {
    const empty = activeKitchenState(5, 22)
    const withNoodle = dispatch(activeKitchenState(1, 22), {
      type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle',
    })
    const gestureSlots = [...withNoodle.slots] as KitchenState['slots']
    gestureSlots[0] = {
      ...gestureSlots[0],
      phase: 'gesturing',
      recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog'],
      heatState: 'none',
    }
    const gestureReady = { ...withNoodle, slots: gestureSlots }
    const rolledSlots = [...withNoodle.slots] as KitchenState['slots']
    rolledSlots[0] = {
      ...rolledSlots[0],
      phase: 'rolled',
      recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll'],
      sauceCoverage: 1,
      cutTargetIndices: [0, 1, 2],
      rollProgress: 1,
    }
    const rolled = { ...withNoodle, slots: rolledSlots }
    const tray = kitchenWithTrayDish()
    const mutations = [
      { state: empty, action: { type: 'TICK', deltaMs: 100 } as const },
      { state: empty, action: { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' } as const },
      { state: withNoodle, action: { type: 'TAP_EGG', slotId: 'left' } as const },
      {
        state: gestureReady,
        action: {
          type: 'COMPLETE_GESTURE',
          slotId: 'left',
          gesture: { kind: 'sauce', coverage: 1, uniformity: 1, complete: true },
        } as const,
      },
      { state: withNoodle, action: { type: 'DISCARD_SLOT', slotId: 'left' } as const },
      { state: rolled, action: { type: 'MOVE_TO_TRAY', slotId: 'left' } as const },
      { state: tray, action: { type: 'DELIVER', slotId: 'left', customerId: 'customer-0' } as const },
      { state: empty, action: { type: 'INJECT_CELEBRITY' } as const },
    ]

    for (const { state: ready, action } of mutations) {
      expect(dispatch(ready, action)).not.toBe(ready)
      const paused = { ...ready, paused: true }
      expect(dispatch(paused, action)).toBe(paused)
    }

    const paused = { ...empty, paused: true }
    expect(dispatch(paused, { type: 'SET_PAUSED', paused: false })).toEqual({ ...empty, paused: false })
  })

  it('discards two orphaned slots after timeouts so both lanes can be reused', () => {
    let state = activeKitchenState(1, 12)
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })
    state = dispatch(state, { type: 'TICK', deltaMs: 90_000 })
    expect(state.customers.every((customer) => customer.presence === 'leaving')).toBe(true)
    expect(state.slots.every((slot) => slot.orderId !== null)).toBe(true)

    state = dispatch(state, { type: 'DISCARD_SLOT', slotId: 'left' })
    state = dispatch(state, { type: 'DISCARD_SLOT', slotId: 'right' })
    state = dispatch(state, { type: 'TICK', deltaMs: 1_300 })
    state = dispatch(state, { type: 'TICK', deltaMs: 1_700 })
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = dispatch(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })

    expect(state.slots.every((slot) => slot.orderId !== null)).toBe(true)
    expect(new Set(state.slots.map((slot) => slot.orderId)).size).toBe(2)
  })

  it('keeps wrong-customer disappointment active for exactly 650 game milliseconds', () => {
    let state = kitchenWithTrayDish()
    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: 'customer-1' })
    const token = state.customers[1].transientMood!.token
    expect(state.customers[1].mood).toBe('disappointed')

    state = dispatch(state, { type: 'TICK', deltaMs: 649 })
    state = dispatch(state, { type: 'CLEAR_TRANSIENT_MOOD', customerId: 'customer-1', token })
    expect(state.customers[1].mood).toBe('disappointed')
    expect(state.customers[1].transientMood).toBeDefined()

    state = dispatch(state, { type: 'TICK', deltaMs: 1 })
    expect(state.customers[1].mood).toBe('waiting')
    expect(state.customers[1].transientMood).toBeUndefined()
  })

  it('ignores an older clear after a newer wrong-delivery reaction', () => {
    let state = kitchenWithTrayDish()
    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: 'customer-1' })
    const oldToken = state.customers[1].transientMood!.token
    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: 'customer-1' })
    const currentToken = state.customers[1].transientMood!.token

    state = dispatch(state, { type: 'CLEAR_TRANSIENT_MOOD', customerId: 'customer-1', token: oldToken })
    expect(state.customers[1].mood).toBe('disappointed')
    expect(state.customers[1].transientMood!.token).toBe(currentToken)

    state = dispatch(state, { type: 'CLEAR_TRANSIENT_MOOD', customerId: 'customer-1', token: currentToken })
    expect(state.customers[1].mood).toBe('disappointed')
    expect(state.customers[1].transientMood!.token).toBe(currentToken)
  })

  it('never reuses a transient token after the previous reaction expires', () => {
    let state = kitchenWithTrayDish()
    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: 'customer-1' })
    const expiredToken = state.customers[1].transientMood!.token
    state = dispatch(state, { type: 'TICK', deltaMs: 650 })
    expect(state.customers[1].transientMood).toBeUndefined()

    state = dispatch(state, { type: 'DELIVER', slotId: 'left', customerId: 'customer-1' })
    const currentToken = state.customers[1].transientMood!.token
    expect(currentToken).toBeGreaterThan(expiredToken)

    state = dispatch(state, { type: 'CLEAR_TRANSIENT_MOOD', customerId: 'customer-1', token: expiredToken })
    expect(state.customers[1].mood).toBe('disappointed')
    expect(state.customers[1].transientMood!.token).toBe(currentToken)
  })
})

describe('useKitchenGame animation clock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('caps animation-frame ticks at 100 ms and cancels the pending frame on unmount', () => {
    const callbacks = new Map<number, FrameRequestCallback>()
    let nextFrameId = 0
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      nextFrameId += 1
      callbacks.set(nextFrameId, callback)
      return nextFrameId
    })
    const cancelFrame = vi.fn((frameId: number) => callbacks.delete(frameId))
    vi.stubGlobal('requestAnimationFrame', requestFrame)
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)

    let latest = { state: createKitchenState(1, 9) } as ReturnType<typeof useKitchenGame>
    function Probe() {
      latest = useKitchenGame(1, 9)
      return null
    }

    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(createElement(Probe)))
    const firstFrame = callbacks.get(1)
    expect(firstFrame).toBeDefined()
    act(() => firstFrame?.(1_000))
    const secondFrame = callbacks.get(2)
    act(() => secondFrame?.(1_250))

    expect(latest.state.elapsedMs).toBe(100)
    act(() => root.unmount())
    expect(cancelFrame).toHaveBeenCalledWith(3)
  })
})
