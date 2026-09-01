import { ingredientForCookingStep, type IngredientId, type RecipeId, type StepId } from '../landscape/campaign'
import { tutorialStep, type TutorialStep } from '../landscape/kitchen/tutorial'
import type { KitchenState, SlotId } from '../landscape/kitchen/types'
import type { MistakeType } from './events'

export type KitchenObservation =
  | { kind: 'tutorial_step_changed'; previousStep: TutorialStep; currentStep: TutorialStep }
  | { kind: 'ingredient_placed'; ingredientId: IngredientId; recipeId: RecipeId; stepId: string; slotId: SlotId }
  | { kind: 'gesture_completed'; gestureId: 'sauce' | 'cut' | 'roll'; recipeId: RecipeId; stepId: string; slotId: SlotId }
  | { kind: 'dish_packed'; recipeId: RecipeId; slotId: SlotId }
  | { kind: 'delivery_completed'; recipeId: RecipeId; slotId: SlotId; customerId: string; quality: number }
  | { kind: 'order_timeout'; recipeId: RecipeId; customerId: string }
  | { kind: 'mistake_recorded'; mistakeType: MistakeType; stepId?: string; slotId?: SlotId }

export type KitchenInteractionIntent =
  | { kind: 'ingredient_selected'; ingredientId: IngredientId; slotId?: SlotId }
  | { kind: 'serve_attempted'; recipeId: RecipeId; slotId: SlotId; customerId: string; accepted: boolean; reason?: 'wrong_customer' | 'not_ready' | 'unknown' }
  | { kind: 'griddle_discarded'; recipeId?: RecipeId; slotId: SlotId }

const GESTURES = new Set(['sauce', 'cut', 'roll'])

function mistakeType(previous: KitchenState, current: KitchenState): { mistakeType: MistakeType; slotId?: SlotId } {
  const discarded = previous.slots.find((slot) => slot.phase !== 'empty'
    && current.slots.find((candidate) => candidate.id === slot.id)?.phase === 'empty'
    && !current.deliveries.some((delivery) => delivery.orderId === slot.orderId))
  if (discarded) return { mistakeType: 'discard', slotId: discarded.id }
  const wrongCustomer = current.customers.find((customer) => customer.transientMood?.mood === 'disappointed'
    && !previous.customers.find((candidate) => candidate.id === customer.id)?.transientMood)
  if (wrongCustomer) return { mistakeType: 'serve' }
  return { mistakeType: 'unknown' }
}

export function observeKitchenTransition(previous: KitchenState, current: KitchenState): KitchenObservation[] {
  if (previous === current) return []
  const observations: KitchenObservation[] = []

  const previousTutorialStep = tutorialStep(previous)
  const currentTutorialStep = tutorialStep(current)
  if (previousTutorialStep !== currentTutorialStep) {
    observations.push({ kind: 'tutorial_step_changed', previousStep: previousTutorialStep, currentStep: currentTutorialStep })
  }

  for (const currentSlot of current.slots) {
    const previousSlot = previous.slots.find((slot) => slot.id === currentSlot.id)
    if (!previousSlot || !currentSlot.recipeId) continue
    const completed = currentSlot.completedStepIds.slice(previousSlot.completedStepIds.length)
    for (const stepId of completed) {
      if (GESTURES.has(stepId)) {
        observations.push({
          kind: 'gesture_completed',
          gestureId: stepId as 'sauce' | 'cut' | 'roll',
          recipeId: currentSlot.recipeId,
          stepId,
          slotId: currentSlot.id,
        })
      } else if (stepId === 'pack') {
        observations.push({ kind: 'dish_packed', recipeId: currentSlot.recipeId, slotId: currentSlot.id })
      } else {
        const ingredientId = ingredientForCookingStep(stepId as StepId)
        if (ingredientId) {
          observations.push({
            kind: 'ingredient_placed',
            ingredientId,
            recipeId: currentSlot.recipeId,
            stepId,
            slotId: currentSlot.id,
          })
        }
      }
    }
  }

  const newDeliveries = current.deliveries.slice(previous.deliveries.length)
  for (const delivery of newDeliveries) {
    const previousSlot = previous.slots.find((slot) => slot.orderId === delivery.orderId)
    const customer = previous.customers.find((candidate) => candidate.order.id === delivery.orderId)
    if (!previousSlot || !customer) continue
    observations.push({
      kind: 'delivery_completed',
      recipeId: delivery.recipeId,
      slotId: previousSlot.id,
      customerId: customer.id,
      quality: delivery.quality,
    })
  }

  const deliveredOrderIds = new Set(newDeliveries.map((delivery) => delivery.orderId))
  for (const previousCustomer of previous.customers) {
    if (deliveredOrderIds.has(previousCustomer.order.id)) continue
    const currentCustomer = current.customers.find((customer) => customer.id === previousCustomer.id)
    if (previousCustomer.presence !== 'leaving'
      && currentCustomer?.presence === 'leaving'
      && currentCustomer.mood === 'disappointed') {
      observations.push({
        kind: 'order_timeout',
        recipeId: previousCustomer.order.recipeId,
        customerId: previousCustomer.id,
      })
    }
  }

  if (current.mistakes > previous.mistakes) {
    const inferred = mistakeType(previous, current)
    for (let count = previous.mistakes; count < current.mistakes; count += 1) {
      observations.push({ kind: 'mistake_recorded', ...inferred })
    }
  }

  return observations
}
