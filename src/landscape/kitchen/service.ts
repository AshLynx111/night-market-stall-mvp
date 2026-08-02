import { clamp } from '../geometry'
import { heatQualityPenalty, slotExpectedAction } from './griddle'
import { markCustomerHappy } from './queue'
import { createEmptySlot } from './state'
import type { GestureResult } from './gestures'
import type { GriddleSlotState, KitchenState, SlotId } from './types'

export interface ServiceFeedback {
  customerId: string
  mood: 'disappointed'
  durationMs: 650
}

export interface ServiceResult {
  state: KitchenState
  accepted: boolean
  reason?: 'missing-slot' | 'wrong-step' | 'not-ready' | 'wrong-customer' | 'missing-customer' | 'inactive-customer'
  quality?: number
  feedback?: ServiceFeedback
}

function replaceSlot(state: KitchenState, slotIndex: number, slot: GriddleSlotState): KitchenState {
  const slots = [...state.slots] as KitchenState['slots']
  slots[slotIndex] = slot
  return { ...state, slots }
}

function appendCompletedStep(slot: GriddleSlotState, stepId: 'sauce' | 'cut' | 'roll' | 'pack') {
  return slot.completedStepIds.includes(stepId)
    ? slot.completedStepIds
    : [...slot.completedStepIds, stepId]
}

export function applyGesture(state: KitchenState, slotId: SlotId, result: GestureResult): ServiceResult {
  const slotIndex = state.slots.findIndex((slot) => slot.id === slotId)
  const slot = state.slots[slotIndex]
  if (!slot) return { state, accepted: false, reason: 'missing-slot' }
  if (slot.phase === 'cooking' && slot.heatState === 'raw') {
    return { state, accepted: false, reason: 'not-ready' }
  }
  const expected = slotExpectedAction(state, slotId)
  if (!result.complete || expected?.id !== result.kind) {
    return { state, accepted: false, reason: result.complete ? 'wrong-step' : 'not-ready' }
  }

  if (result.kind === 'sauce') {
    const nextSlot: GriddleSlotState = {
      ...slot,
      phase: 'gesturing',
      completedStepIds: appendCompletedStep(slot, 'sauce'),
      heatState: 'none',
      heatElapsedMs: 0,
      heatReadyAtMs: 0,
      heatBurnAtMs: 0,
      sauceCoverage: clamp(result.coverage),
      qualityPenalty: slot.qualityPenalty
        + heatQualityPenalty(slot.heatState)
        + clamp(result.coverage) * (1 - clamp(result.uniformity)) * 25,
    }
    return { state: replaceSlot(state, slotIndex, nextSlot), accepted: true }
  }

  if (result.kind === 'cut') {
    if (slot.cutTargetIndices.length >= 3
      || result.targetIndex === null
      || slot.cutTargetIndices.includes(result.targetIndex)) {
      return { state, accepted: false, reason: 'wrong-step' }
    }
    const cutTargetIndices = [...slot.cutTargetIndices, result.targetIndex].sort((left, right) => left - right)
    const nextSlot: GriddleSlotState = {
      ...slot,
      phase: 'gesturing',
      cutTargetIndices,
      completedStepIds: cutTargetIndices.length === 3 ? appendCompletedStep(slot, 'cut') : slot.completedStepIds,
      qualityPenalty: slot.qualityPenalty + (1 - clamp(result.accuracy)) * 5,
    }
    return { state: replaceSlot(state, slotIndex, nextSlot), accepted: true }
  }

  const nextSlot: GriddleSlotState = {
    ...slot,
    phase: 'rolled',
    completedStepIds: appendCompletedStep(slot, 'roll'),
    rollProgress: clamp(result.progress),
  }
  return { state: replaceSlot(state, slotIndex, nextSlot), accepted: true }
}

export function moveSlotToTray(state: KitchenState, slotId: SlotId): ServiceResult {
  const slotIndex = state.slots.findIndex((slot) => slot.id === slotId)
  const slot = state.slots[slotIndex]
  if (!slot) return { state, accepted: false, reason: 'missing-slot' }
  if (slot.phase !== 'rolled' || slotExpectedAction(state, slotId)?.id !== 'pack') {
    return { state, accepted: false, reason: 'not-ready' }
  }
  return {
    state: replaceSlot(state, slotIndex, {
      ...slot,
      phase: 'on-tray',
      completedStepIds: appendCompletedStep(slot, 'pack'),
    }),
    accepted: true,
  }
}

function dishQuality(slot: GriddleSlotState) {
  const saucePenalty = (1 - clamp(slot.sauceCoverage)) * 25
  const cutPenalty = (1 - clamp(slot.cutTargetIndices.length / 3)) * 15
  const rollPenalty = (1 - clamp(slot.rollProgress)) * 10
  return Math.round(clamp(100 - slot.qualityPenalty - saucePenalty - cutPenalty - rollPenalty, 0, 100) * 10) / 10
}

export function deliverDish(state: KitchenState, slotId: SlotId, customerId: string): ServiceResult {
  const slotIndex = state.slots.findIndex((slot) => slot.id === slotId)
  const slot = state.slots[slotIndex]
  if (!slot) return { state, accepted: false, reason: 'missing-slot' }
  if (slot.phase !== 'on-tray' || !slot.orderId || !slot.recipeId) return { state, accepted: false, reason: 'not-ready' }

  const intendedCustomer = state.customers.find((customer) => customer.order.id === slot.orderId)
  const receivingCustomer = state.customers.find((customer) => customer.id === customerId)
  if (!intendedCustomer || !receivingCustomer) {
    return { state, accepted: false, reason: 'missing-customer' }
  }

  if (intendedCustomer.presence !== 'active' || receivingCustomer.presence !== 'active') {
    return { state, accepted: false, reason: 'inactive-customer' }
  }

  if (intendedCustomer.id !== receivingCustomer.id) {
    const customers = state.customers.map((customer) => {
      if (customer.id === intendedCustomer.id) {
        return { ...customer, patienceMs: Math.max(0, customer.patienceMs - 2_000) }
      }
      if (customer.id === receivingCustomer.id && customer.presence === 'active') {
        return { ...customer, mood: 'disappointed' as const }
      }
      return customer
    })
    return {
      state: { ...state, customers, mistakes: state.mistakes + 1 },
      accepted: false,
      reason: 'wrong-customer',
      feedback: { customerId: receivingCustomer.id, mood: 'disappointed', durationMs: 650 },
    }
  }

  const quality = dishQuality(slot)
  const emptied = replaceSlot(state, slotIndex, createEmptySlot(slot.id))
  const served = markCustomerHappy(emptied, intendedCustomer.id)
  const celebrityServed = served.celebrityServed || served.celebrityOrderId === slot.orderId
  return {
    state: {
      ...served,
      celebrityServed,
      servedQualities: [...served.servedQualities, quality],
      deliveries: [...served.deliveries, { orderId: slot.orderId, recipeId: slot.recipeId, quality }],
    },
    accepted: true,
    quality,
  }
}
