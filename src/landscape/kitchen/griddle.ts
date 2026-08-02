import { effectiveRecipeSteps, ingredientForCookingStep, INGREDIENT_UNLOCK_DAY } from '../campaign'
import type { CookingStep, IngredientId, StepId } from '../campaign'
import type { GriddleSlotState, HeatState, KitchenState, SlotId } from './types'
import { createEmptySlot } from './state'
import { isTutorialHeatProtected, tutorialAllowsIngredient } from './tutorial'

export interface KitchenResult {
  state: KitchenState
  accepted: boolean
  reason?: 'occupied' | 'wrong-step' | 'locked' | 'not-ready'
}

const HEAT_READY_MS: Partial<Record<StepId, number>> = {
  egg: 4_000,
  'second-egg': 4_000,
  'hot-dog': 3_000,
  'turkey-noodle': 5_000,
  orleans: 4_000,
  bacon: 3_500,
  tenderloin: 5_000,
}

function slotIndex(state: KitchenState, slotId: SlotId): number {
  return state.slots.findIndex((slot) => slot.id === slotId)
}

function replaceSlot(state: KitchenState, index: number, slot: GriddleSlotState): KitchenState {
  const slots = [...state.slots] as [GriddleSlotState, GriddleSlotState]
  slots[index] = slot
  return { ...state, slots }
}

function ingredientForStep(step: CookingStep | null): IngredientId | null {
  return step ? ingredientForCookingStep(step) : null
}

export function heatQualityPenalty(heatState: HeatState) {
  return heatState === 'burnt' ? 15 : heatState === 'scorched' ? 5 : 0
}

function firstAvailableOrder(state: KitchenState, ingredient: IngredientId) {
  const assignedOrderIds = new Set(state.slots.map((slot) => slot.orderId).filter(Boolean))
  return state.customers.find((customer) => {
    if (customer.presence !== 'active' || assignedOrderIds.has(customer.order.id)) return false
    const firstStep = effectiveRecipeSteps(customer.order.recipeId, customer.order.modifiers)[0]
    return ingredientForStep(firstStep) === ingredient
  })
}

export function slotExpectedAction(state: KitchenState, slotId: SlotId): CookingStep | null {
  const slot = state.slots[slotIndex(state, slotId)]
  if (!slot?.recipeId) return null
  if (slot.phase === 'cooking' && slot.heatState === 'raw') return null
  return effectiveRecipeSteps(slot.recipeId, slot.orderModifiers)[slot.completedStepIds.length] ?? null
}

function acceptStep(state: KitchenState, index: number, step: CookingStep): KitchenResult {
  const slot = state.slots[index]
  const readyAtMs = HEAT_READY_MS[step.id]
  const nextSlot: GriddleSlotState = {
    ...slot,
    completedStepIds: [...slot.completedStepIds, step.id],
    phase: readyAtMs === undefined ? 'assembling' : 'cooking',
    heatState: readyAtMs === undefined ? 'none' : 'raw',
    heatElapsedMs: 0,
    heatReadyAtMs: readyAtMs ?? 0,
    heatBurnAtMs: readyAtMs === undefined ? 0 : readyAtMs + 8_000,
    qualityPenalty: slot.qualityPenalty + heatQualityPenalty(slot.heatState),
  }
  return { state: replaceSlot(state, index, nextSlot), accepted: true }
}

export function placeIngredient(state: KitchenState, slotId: SlotId, ingredient: IngredientId): KitchenResult {
  if (!tutorialAllowsIngredient(state, ingredient, slotId)) {
    return { state, accepted: false, reason: 'wrong-step' }
  }
  if (INGREDIENT_UNLOCK_DAY[ingredient] > state.day) return { state, accepted: false, reason: 'locked' }

  const index = slotIndex(state, slotId)
  const slot = state.slots[index]
  if (!slot) return { state, accepted: false, reason: 'wrong-step' }

  if (slot.phase === 'empty') {
    if (ingredient !== 'noodle') return { state, accepted: false, reason: 'wrong-step' }
    const customer = firstAvailableOrder(state, ingredient)
    if (!customer) return { state, accepted: false, reason: 'occupied' }

    const boundSlot: GriddleSlotState = {
      ...slot,
      phase: 'assembling',
      orderId: customer.order.id,
      recipeId: customer.order.recipeId,
      orderModifiers: customer.order.modifiers.map((modifier) => ({ ...modifier })),
    }
    const boundState = replaceSlot(state, index, boundSlot)
    const step = slotExpectedAction(boundState, slotId)
    return step ? acceptStep(boundState, index, step) : { state, accepted: false, reason: 'wrong-step' }
  }

  if (slot.phase === 'cooking' && slot.heatState === 'raw') {
    return { state, accepted: false, reason: 'not-ready' }
  }

  const expected = slotExpectedAction(state, slotId)
  if (!expected || ingredientForStep(expected) !== ingredient) {
    return { state, accepted: false, reason: 'wrong-step' }
  }

  return acceptStep(state, index, expected)
}

function heatStateAt(slot: GriddleSlotState, heatElapsedMs: number): HeatState {
  if (heatElapsedMs < slot.heatReadyAtMs) return 'raw'
  if (heatElapsedMs < slot.heatBurnAtMs) return 'ready'
  if (heatElapsedMs < slot.heatBurnAtMs + 2_000) return 'scorched'
  return 'burnt'
}

export function advanceGriddles(state: KitchenState, deltaMs: number): KitchenState {
  const elapsedMs = Math.max(0, deltaMs)
  if (state.paused || elapsedMs === 0) return state

  let changed = false
  const slots = state.slots.map((slot) => {
    if (slot.phase !== 'cooking') return slot
    changed = true
    const heatElapsedMs = isTutorialHeatProtected(state, slot)
      ? Math.min(slot.heatReadyAtMs, slot.heatElapsedMs + elapsedMs)
      : slot.heatElapsedMs + elapsedMs
    return { ...slot, heatElapsedMs, heatState: heatStateAt(slot, heatElapsedMs) }
  }) as [GriddleSlotState, GriddleSlotState]

  return changed ? { ...state, slots } : state
}

export function discardSlot(state: KitchenState, slotId: SlotId): KitchenState {
  const index = slotIndex(state, slotId)
  const slot = state.slots[index]
  if (!slot) return state
  return { ...replaceSlot(state, index, createEmptySlot(slot.id)), mistakes: state.mistakes + 1 }
}
